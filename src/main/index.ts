import bootstrap from "./bootstrap/app";

bootstrap().catch((err: unknown): void => {
    console.error("[bootstrap] fatal:", err);
    process.exit(1);
});
