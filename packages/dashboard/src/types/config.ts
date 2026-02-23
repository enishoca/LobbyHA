export interface AppConfig {
  HA_URL: string;
  HA_TOKEN: string;
  PORT: string;
  LOG_LEVEL: string;
}

export interface SetupStatus {
  needsSetup: boolean;
}
