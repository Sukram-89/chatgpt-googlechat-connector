import { RotationMember, RotationState } from "../rotation";

export function getMention(member: RotationMember | null) {
  if (!member) {
    return "n/a";
  }

  if (member.chatUserId) {
    return `<${member.chatUserId}>`;
  }

  if (member.email) {
    return `<users/${member.email}>`;
  }

  return member.displayName;
}

export function formatRotationNow(label: string, rotation: RotationState) {
  if (!rotation.current) {
    return `${label}: no members configured.`;
  }

  return `${label}: ${getMention(rotation.current)} is responsible now. Next: ${getMention(
    rotation.next
  )}.`;
}

export function formatRotationList(label: string, rotation: RotationState) {
  if (!rotation.members.length) {
    return `${label}: no members configured.`;
  }

  const members = rotation.members
    .map((member, index) => `${index + 1}. ${getMention(member)}`)
    .join("\n");

  return `${label} rotation:\n${members}\nCurrent: ${getMention(
    rotation.current
  )}\nNext: ${getMention(rotation.next)}`;
}
