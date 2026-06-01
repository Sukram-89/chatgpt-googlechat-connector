export interface RotationMember {
  displayName: string;
  userId?: string;
  chatUserId?: string;
  email?: string;
  activityName?: string;
  activityDate?: string;
}

export interface RotationConfig {
  members: RotationMember[];
  activityDate?: string;
  activityName?: string;
}

export interface RotationState extends RotationConfig {
  current: RotationMember | null;
  next: RotationMember | null;
}

export function getCurrentRotationMember(
  config: RotationConfig,
  date = new Date()
): RotationMember | null {
  if (!config.members?.length) return null;
  const index =
    (date.getFullYear() * 12 + date.getMonth()) % config.members.length;
  return config.members[index];
}

export function getNextRotationMember(
  config: RotationConfig,
  date = new Date()
): RotationMember | null {
  if (!config.members?.length) return null;
  const index =
    (date.getFullYear() * 12 + date.getMonth() + 1) % config.members.length;
  return config.members[index];
}

export function getRotationState(
  config: RotationConfig,
  date = new Date()
): RotationState {
  return {
    members: config.members || [],
    activityDate: config.activityDate,
    activityName: config.activityName,
    current: getCurrentRotationMember(config, date),
    next: getNextRotationMember(config, date)
  };
}
