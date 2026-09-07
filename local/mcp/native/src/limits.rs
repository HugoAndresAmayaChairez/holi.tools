//! Operating-system bounds for disposable rendering workers.
//!
//! The parent attaches a Windows Job Object before sending input. Unix workers
//! configure their own limits before reading input. Failure to install a limit
//! must abort that job; callers must not continue with an unbounded worker.

use std::io;
use tokio::process::Child;

#[cfg(windows)]
pub const MEMORY_LIMIT_BYTES: u64 = 1024 * 1024 * 1024;
#[cfg(unix)]
pub const MEMORY_LIMIT_BYTES: u64 = 2 * 1024 * 1024 * 1024;

#[cfg(windows)]
mod platform {
    use super::*;
    use std::os::windows::io::{AsRawHandle, FromRawHandle, OwnedHandle};
    use windows_sys::Win32::System::JobObjects::{
        AssignProcessToJobObject, CreateJobObjectW, JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE,
        JOB_OBJECT_LIMIT_PROCESS_MEMORY, JOBOBJECT_EXTENDED_LIMIT_INFORMATION,
        JobObjectExtendedLimitInformation, SetInformationJobObject,
    };

    /// Owns the last non-inherited job handle. Dropping it terminates any worker
    /// still assigned to the job. OwnedHandle provides Send without a manual
    /// unsafe Send implementation, so this guard may cross asynchronous waits.
    pub struct Guard {
        job: OwnedHandle,
    }

    impl Guard {
        fn new() -> io::Result<Self> {
            // SAFETY: null name creates an unnamed job; null security attributes
            // make this handle non-inheritable. No borrowed pointers outlive the call.
            let raw = unsafe { CreateJobObjectW(std::ptr::null(), std::ptr::null()) };
            if raw.is_null() {
                return Err(io::Error::last_os_error());
            }
            // SAFETY: CreateJobObjectW returned a new valid handle owned by this
            // function. OwnedHandle closes it exactly once on every return path.
            let guard = Self {
                job: unsafe { OwnedHandle::from_raw_handle(raw) },
            };
            let mut limits = JOBOBJECT_EXTENDED_LIMIT_INFORMATION::default();
            limits.BasicLimitInformation.LimitFlags =
                JOB_OBJECT_LIMIT_PROCESS_MEMORY | JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
            limits.ProcessMemoryLimit = MEMORY_LIMIT_BYTES as usize;
            // SAFETY: the handle is live and the fully initialized structure and
            // its exact length match the JobObjectExtendedLimitInformation class.
            let installed = unsafe {
                SetInformationJobObject(
                    guard.job.as_raw_handle(),
                    JobObjectExtendedLimitInformation,
                    (&limits as *const JOBOBJECT_EXTENDED_LIMIT_INFORMATION).cast(),
                    std::mem::size_of_val(&limits) as u32,
                )
            };
            if installed == 0 {
                return Err(io::Error::last_os_error());
            }
            Ok(guard)
        }
    }

    pub fn attach(child: &Child) -> io::Result<Guard> {
        let process = child.raw_handle().ok_or_else(|| {
            io::Error::other("Rendering worker stopped before limits were installed")
        })?;
        let guard = Guard::new()?;
        // SAFETY: child owns the live process handle for this synchronous call;
        // guard owns the configured job handle. Neither handle is transferred.
        if unsafe { AssignProcessToJobObject(guard.job.as_raw_handle(), process) } == 0 {
            return Err(io::Error::last_os_error());
        }
        Ok(guard)
    }

    // Windows receives no document input until the parent has attached its job.
    pub fn configure_worker() -> io::Result<()> {
        Ok(())
    }

    #[cfg(test)]
    mod tests {
        use super::*;
        use std::{process::Stdio, time::Duration};
        use windows_sys::Win32::System::JobObjects::{IsProcessInJob, QueryInformationJobObject};

        #[test]
        fn guard_can_cross_async_waits() {
            fn assert_send<T: Send>() {}
            assert_send::<Guard>();
        }

        #[test]
        #[ignore = "subprocess helper; invoked only by the lifecycle test"]
        fn worker_waits_for_job_close() {
            assert_eq!(std::env::var("HOLI_LIMIT_TEST_WORKER").as_deref(), Ok("1"));
            println!("HOLI_LIMIT_READY");
            loop {
                std::thread::park();
            }
        }

        #[tokio::test]
        async fn installed_memory_limit_and_drop_terminate_real_worker() {
            let mut command = tokio::process::Command::new(std::env::current_exe().unwrap());
            command
                .args([
                    "--exact",
                    "limits::platform::tests::worker_waits_for_job_close",
                    "--ignored",
                    "--nocapture",
                ])
                .env("HOLI_LIMIT_TEST_WORKER", "1")
                .stdin(Stdio::null())
                .stdout(Stdio::piped())
                .stderr(Stdio::null())
                .creation_flags(0x08000000)
                .kill_on_drop(true);
            let mut child = command.spawn().unwrap();
            let guard = attach(&child).unwrap();
            use tokio::io::AsyncBufReadExt;
            let mut reader = tokio::io::BufReader::new(child.stdout.take().unwrap());
            tokio::time::timeout(Duration::from_secs(5), async {
                loop {
                    let mut line = String::new();
                    assert_ne!(reader.read_line(&mut line).await.unwrap(), 0);
                    if line.contains("HOLI_LIMIT_READY") {
                        break;
                    }
                }
            })
            .await
            .expect("worker must reach its idle loop before testing job close");
            let mut information = JOBOBJECT_EXTENDED_LIMIT_INFORMATION::default();
            // SAFETY: the live guard and correctly sized output structure satisfy
            // the Windows query contract; the optional returned length is unused.
            let queried = unsafe {
                QueryInformationJobObject(
                    guard.job.as_raw_handle(),
                    JobObjectExtendedLimitInformation,
                    (&mut information as *mut JOBOBJECT_EXTENDED_LIMIT_INFORMATION).cast(),
                    std::mem::size_of_val(&information) as u32,
                    std::ptr::null_mut(),
                )
            };
            assert_ne!(queried, 0);
            assert_eq!(information.ProcessMemoryLimit, MEMORY_LIMIT_BYTES as usize);
            assert_ne!(
                information.BasicLimitInformation.LimitFlags & JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE,
                0
            );
            assert_ne!(
                information.BasicLimitInformation.LimitFlags & JOB_OBJECT_LIMIT_PROCESS_MEMORY,
                0
            );
            let mut belongs = 0;
            // SAFETY: both handles are live; belongs is a valid BOOL output pointer.
            assert_ne!(
                unsafe {
                    IsProcessInJob(
                        child.raw_handle().unwrap(),
                        guard.job.as_raw_handle(),
                        &mut belongs,
                    )
                },
                0
            );
            assert_ne!(belongs, 0);
            assert!(child.try_wait().unwrap().is_none());
            drop(guard);
            // Windows may report exit code zero for kill-on-job-close. A ready
            // helper never exits on its own, so bounded termination is the check.
            tokio::time::timeout(Duration::from_secs(5), child.wait())
                .await
                .expect("closing the last job handle must terminate its worker")
                .unwrap();
        }
    }
}

#[cfg(unix)]
mod platform {
    use super::*;

    // Unix termination remains owned by Tokio's kill_on_drop and the parent
    // timeout; Linux additionally kills the worker when its parent process dies.
    pub struct Guard;

    pub fn attach(_child: &Child) -> io::Result<Guard> {
        Ok(Guard)
    }

    #[cfg(target_os = "macos")]
    fn memory_cap() -> io::Result<libc::rlim_t> {
        let mut information = std::mem::MaybeUninit::<libc::proc_taskinfo>::uninit();
        let size = std::mem::size_of::<libc::proc_taskinfo>() as libc::c_int;
        // SAFETY: query only our own process. The writable output allocation has
        // the exact PROC_PIDTASKINFO size; it is read only after a complete result.
        let written = unsafe {
            libc::proc_pidinfo(
                libc::getpid(),
                libc::PROC_PIDTASKINFO,
                0,
                information.as_mut_ptr().cast(),
                size,
            )
        };
        if written != size {
            return Err(io::Error::other(
                "Could not read the worker's initial virtual memory size",
            ));
        }
        // SAFETY: proc_pidinfo confirmed that it initialized the entire structure.
        let baseline = unsafe { information.assume_init() }.pti_virtual_size;
        if baseline == 0 {
            return Err(io::Error::other("Invalid worker virtual memory baseline"));
        }
        baseline
            .checked_add(MEMORY_LIMIT_BYTES)
            .filter(|cap| *cap < libc::RLIM_INFINITY)
            .ok_or_else(|| io::Error::other("Worker virtual memory limit overflow"))
    }

    #[cfg(not(target_os = "macos"))]
    fn memory_cap() -> io::Result<libc::rlim_t> {
        Ok(MEMORY_LIMIT_BYTES as libc::rlim_t)
    }

    pub fn configure_worker() -> io::Result<()> {
        configure_worker_limits().map(|_| ())
    }

    fn configure_worker_limits() -> io::Result<libc::rlim_t> {
        #[cfg(target_os = "linux")]
        {
            // SAFETY: getppid has no arguments or memory preconditions. prctl's
            // PR_SET_PDEATHSIG takes the signal value directly; no pointer is used.
            let parent = unsafe { libc::getppid() };
            if unsafe { libc::prctl(libc::PR_SET_PDEATHSIG, libc::SIGKILL, 0, 0, 0) } != 0 {
                return Err(io::Error::last_os_error());
            }
            if unsafe { libc::getppid() } != parent {
                return Err(io::Error::other(
                    "Rendering worker parent exited during startup",
                ));
            }
        }

        // Disable worker core dumps before reading private document content.
        // RLIMIT_AS bounds address space, not RSS. macOS starts with a large dyld
        // shared region, so allow 2 GiB above the initial OS-reported virtual size.
        // This is an address-space growth allowance, not a total-RAM ceiling.
        // Apple's API adjusts reserved regions for exotic maps (e.g. Rosetta),
        // while setrlimit checks the raw map. If the resulting cap is insufficient,
        // installation fails closed; never retry with an unlimited/larger cap.
        // Native Intel/Apple Silicon and Rosetta acceptance still require macOS CI.
        let memory = memory_cap()?;
        for (resource, cap) in [(libc::RLIMIT_CORE, 0), (libc::RLIMIT_AS, memory)] {
            let mut previous = libc::rlimit {
                rlim_cur: 0,
                rlim_max: 0,
            };
            // SAFETY: resource is a valid RLIMIT constant and previous points to
            // writable storage of exactly the structure expected by getrlimit.
            if unsafe { libc::getrlimit(resource, &mut previous) } != 0 {
                return Err(io::Error::last_os_error());
            }
            let hard = previous.rlim_max.min(cap);
            let limit = libc::rlimit {
                rlim_cur: previous.rlim_cur.min(hard),
                rlim_max: hard,
            };
            // SAFETY: the structure is initialized and the call only lowers this
            // disposable process's own limits; stricter inherited caps remain.
            if unsafe { libc::setrlimit(resource, &limit) } != 0 {
                return Err(io::Error::last_os_error());
            }
        }
        Ok(memory)
    }

    #[cfg(test)]
    mod tests {
        use super::*;
        use std::{process::Stdio, time::Duration};

        #[test]
        #[ignore = "subprocess helper; must not lower the test runner's limits"]
        fn worker_installs_its_own_limits() {
            assert_eq!(std::env::var("HOLI_LIMIT_TEST_WORKER").as_deref(), Ok("1"));
            let memory = configure_worker_limits().unwrap();
            for (resource, cap) in [(libc::RLIMIT_CORE, 0), (libc::RLIMIT_AS, memory)] {
                let mut actual = libc::rlimit {
                    rlim_cur: 0,
                    rlim_max: 0,
                };
                // SAFETY: valid resource ID and writable rlimit output structure.
                assert_eq!(unsafe { libc::getrlimit(resource, &mut actual) }, 0);
                assert!(actual.rlim_cur <= cap);
                assert!(actual.rlim_max <= cap);
            }
        }

        #[tokio::test]
        async fn disposable_process_installs_memory_and_core_limits() {
            let mut child = tokio::process::Command::new(std::env::current_exe().unwrap())
                .args([
                    "--exact",
                    "limits::platform::tests::worker_installs_its_own_limits",
                    "--ignored",
                ])
                .env("HOLI_LIMIT_TEST_WORKER", "1")
                .stdin(Stdio::null())
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .kill_on_drop(true)
                .spawn()
                .unwrap();
            let status = tokio::time::timeout(Duration::from_secs(5), child.wait())
                .await
                .unwrap()
                .unwrap();
            assert!(status.success());
        }
    }
}

#[cfg(not(any(windows, unix)))]
compile_error!("Holi Local worker limits require Windows or Unix");

pub use platform::Guard;

pub fn attach(child: &Child) -> io::Result<Guard> {
    platform::attach(child)
}

pub fn configure_worker() -> io::Result<()> {
    platform::configure_worker()
}
