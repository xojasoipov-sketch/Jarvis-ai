declare module "onvif" {
  export const Discovery: {
    on(event: "device", listener: (cam: unknown, rinfo: { address: string; port: number }) => void): void;
    on(event: "error", listener: (err: Error) => void): void;
    probe(options?: { timeout?: number; resolve?: boolean }): void;
  };
}
