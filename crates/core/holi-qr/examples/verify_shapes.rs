use holi_qr::{
    generate_qr, render_svg_styled, verify_svg, BodyShape, ErrorCorrectionLevel, EyeBallShape,
    EyeFrameShape, StyledRenderOptions,
};
fn main() {
    let args: Vec<String> = std::env::args().collect();
    let only_frame = args.get(1).cloned();
    let qr = generate_qr("https://holi.tools", ErrorCorrectionLevel::Medium).unwrap();
    let bodies = [
        "square",
        "rounded",
        "dots",
        "tiny-dots",
        "capsule",
        "chain",
        "diamond",
        "water",
        "pixel",
    ];
    let frames = [
        "square",
        "rounded",
        "circle",
        "diamond",
        "cushion",
        "leaf",
        "clover-frame",
        "bevel",
        "orbit",
        "flux",
    ];
    let balls = [
        "square",
        "rounded",
        "circle",
        "diamond",
        "star",
        "heart",
        "hexagon",
        "dots-grid",
        "bars-h",
        "bars-v",
    ];
    let mut fails = 0;
    let mut total = 0;
    for b in bodies {
        for f in frames {
            if let Some(of) = &only_frame {
                if of != f {
                    continue;
                }
            }
            for e in balls {
                total += 1;
                let o = StyledRenderOptions {
                    margin: 4,
                    body_shape: BodyShape::from_str(b),
                    eye_frame_shape: EyeFrameShape::from_str(f),
                    eye_ball_shape: EyeBallShape::from_str(e),
                    ..Default::default()
                };
                let svg = render_svg_styled(&qr, &o);
                match verify_svg(&svg) {
                    Ok(t) if t == "https://holi.tools" => {}
                    _ => {
                        fails += 1;
                        println!("FAIL body={b} frame={f} ball={e}");
                    }
                }
            }
        }
    }
    println!("done, {} failures of {}", fails, total);
}
