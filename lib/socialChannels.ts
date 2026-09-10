// Các kênh mạng xã hội được hỗ trợ
export const SOCIAL_PLATFORMS = ["Facebook", "TikTok", "YouTube"] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

// Danh sách kênh/mục tiêu theo nền tảng
export const ALL_SOCIAL_CHANNELS: { platform: SocialPlatform; channel: string }[] = [
  // Facebook
  { platform: "Facebook", channel: "Tân Phú Land" },
  { platform: "Facebook", channel: "Pháp Lý Nhà Đất" },
  // TikTok
  { platform: "TikTok", channel: "Pháp Lý" },
  { platform: "TikTok", channel: "Review" },
  // YouTube
  { platform: "YouTube", channel: "Tân Phú Land" },
];

export function getChannelsForPlatform(platform: SocialPlatform) {
  return ALL_SOCIAL_CHANNELS.filter((c) => c.platform === platform).map((c) => c.channel);
}