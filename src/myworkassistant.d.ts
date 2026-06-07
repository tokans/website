declare module "myworkassistant/embed" {
  export interface SessionUser {
    id: string;
    email?: string | undefined;
    name?: string | undefined;
    role?: string | undefined;
    [k: string]: unknown;
  }
  export interface MountOptions {
    session?: SessionUser | null | undefined;
    apiBaseUrl?: string | undefined;
    basename?: string | undefined;
  }
  /** Mounts the myWorkAssistant cockpit into `el`; returns an unmount fn. */
  export function mount(el: HTMLElement, opts?: MountOptions): () => void;
}

declare module "myworkassistant/embed/style.css";
