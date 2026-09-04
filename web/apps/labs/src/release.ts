import { labsAppChangelog } from "@holi/configs/changelogs";
import packageInfo from "../package.json";

export const labsVersion = packageInfo.version;
export const getLabsChangelog = (lang: string) =>
  labsAppChangelog[lang] ?? labsAppChangelog.en;
