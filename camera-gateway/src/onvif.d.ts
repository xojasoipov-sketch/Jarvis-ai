declare module "onvif" {
  export const Discovery: {
    on(event: "device", listener: (cam: unknown, rinfo: { address: string; port: number }) => void): void;
    on(event: "error", listener: (err: Error) => void): void;
    probe(options?: { timeout?: number; resolve?: boolean }): void;
  };

  export class Cam {
    constructor(
      options: { hostname: string; username: string; password: string; port?: number; timeout?: number },
      callback: (err: Error | null) => void,
    );
    getStreamUri(
      options: { protocol: "RTSP" | "HTTP" | "UDP" },
      callback: (err: Error | null, stream: { uri: string }) => void,
    ): void;
  }
}
