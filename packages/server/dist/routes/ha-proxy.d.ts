declare const router: import("express-serve-static-core").Router;
declare function fetchHa(path: string, options?: RequestInit): Promise<{
    status: number;
    text: string;
}>;
export default router;
export { fetchHa };
//# sourceMappingURL=ha-proxy.d.ts.map