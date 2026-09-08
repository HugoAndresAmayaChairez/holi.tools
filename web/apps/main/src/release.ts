import packageInfo from "../package.json";
import { mainAppChangelog } from "@holi/configs/changelogs";
import { getRuntimeCopy } from "./i18n/runtime";

export const mainVersion = packageInfo.version;
export function getMainChangelog(lang: string) {
  return [
    {
      version: mainVersion,
      date: "2026-09-07",
      changes: [getRuntimeCopy(lang).change],
    },
    ...(mainAppChangelog[lang] ?? mainAppChangelog.en),
  ];
}
