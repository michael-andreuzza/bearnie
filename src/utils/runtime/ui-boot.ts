import { initComboboxes } from "@/utils/runtime/combobox";
import { initCommands, initCommandDialogs } from "@/utils/runtime/command";
import { initDialogs } from "@/utils/runtime/dialog";
import { initDisclosureTriggers } from "@/utils/runtime/disclosure-triggers";
import { initDropdowns } from "@/utils/runtime/dropdown-menu";
import { initPopovers } from "@/utils/runtime/popover";
import { initTabs } from "@/utils/runtime/tabs";

let hasBoundPageLoadListener = false;

function runUiInit() {
  initDisclosureTriggers();
  initPopovers();
  initCommands();
  initCommandDialogs();
  initComboboxes();
  initDialogs();
  initDropdowns();
  initTabs();
}

export function bootUiRuntime() {
  runUiInit();

  if (hasBoundPageLoadListener) return;
  hasBoundPageLoadListener = true;

  document.addEventListener("astro:page-load", runUiInit);
}
