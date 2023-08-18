import { controlObject } from "../preload";

declare global {
  interface Window {
    api: typeof controlObject;
  }
}
