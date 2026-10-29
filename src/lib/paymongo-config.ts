const supportedChannels = ["gcash", "qrph", "card"] as const;

export type PayMongoChannel = (typeof supportedChannels)[number];
export type PayMongoMode = "test" | "live";

export type PayMongoConfig = {
  secretKey: string;
  webhookSecret: string;
  serviceRoleKey: string;
  mode: PayMongoMode;
  channels: PayMongoChannel[];
};

export function getPayMongoConfig(): PayMongoConfig | null {
  const secretKey = process.env.PAYMONGO_SECRET_KEY?.trim() ?? "";
  const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET?.trim() ?? "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  const keyMatch = /^sk_(test|live)_[A-Za-z0-9_-]{8,}$/.exec(secretKey);
  const channels = (process.env.PAYMONGO_PAYMENT_METHOD_TYPES ?? "")
    .split(",")
    .map((channel) => channel.trim().toLowerCase())
    .filter((channel): channel is PayMongoChannel =>
      supportedChannels.includes(channel as PayMongoChannel),
    );

  const isPlaceholder = (value: string) => /^(YOUR_|REPLACE_|CHANGEME|PLACEHOLDER)/i.test(value);
  if (!keyMatch || isPlaceholder(secretKey.slice(8)) || webhookSecret.length < 16 || isPlaceholder(webhookSecret)
    || serviceRoleKey.length < 32 || isPlaceholder(serviceRoleKey) || channels.length === 0) {
    return null;
  }

  return {
    secretKey,
    webhookSecret,
    serviceRoleKey,
    mode: keyMatch[1] as PayMongoMode,
    channels: [...new Set(channels)],
  };
}

export function getEnabledPayMongoChannels(): PayMongoChannel[] {
  return getPayMongoConfig()?.channels ?? [];
}

export function isPayMongoConfigured(): boolean {
  return getPayMongoConfig() !== null;
}
