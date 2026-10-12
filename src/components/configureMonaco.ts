import { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor/editor/editor.api";
import EditorWorker from "monaco-editor/editor/editor.worker.js?worker";
import "monaco-editor/language/json/monaco.contribution";
import JsonWorker from "monaco-editor/language/json/json.worker.js?worker";

globalThis.MonacoEnvironment = {
  getWorker(_moduleId, label) {
    return label === "json" ? new JsonWorker() : new EditorWorker();
  },
};

loader.config({
  monaco: monaco as typeof import("monaco-editor"),
});
