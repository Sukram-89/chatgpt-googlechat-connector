export interface RotationMember {
  displayName: string;
  chatUserId?: string;
}

export interface RotationConfig {
  members: RotationMember[];
  activityDate?: string;
}

export function getCurrentRotationMember(config: RotationConfig, date = new Date()): RotationMember | null {
  if (!config.members?.length) return null;
  const index = (date.getFullYear() * 12 + date.getMonth()) % config.members.length;
  return config.members[index];
}

export function getNextRotationMember(config: RotationConfig, date = new Date()): RotationMember | null {
  if (!config.members?.length) return null;
  const index = ((date.getFullYear() * 12 + date.getMonth()) + 1) % config.members.length;
  return config.members[index];
}
