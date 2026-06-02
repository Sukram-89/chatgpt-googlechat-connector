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

export function formatUpcomingActivities(rotation: RotationState) {
  if (!rotation.members.length) {
    return "Upcoming activities: no activities configured.";
  }

  const members = [...rotation.members]
    .sort((a, b) => {
      const aDate = a.activityDate || "";
      const bDate = b.activityDate || "";

      if (aDate !== bDate) {
        return aDate.localeCompare(bDate);
      }

      const aName = a.activityName || "";
      const bName = b.activityName || "";

      if (aName !== bName) {
        return aName.localeCompare(bName);
      }

      return getMention(a).localeCompare(getMention(b));
    })
    .map((member, index) => {
      const name = member.activityName || "TBD";
      const date = member.activityDate || "TBD";
      const assignee = getMention(member);

      return `${index + 1}. ${name}, ${date} ${assignee}`.trim();
    })
    .join("\n");

  return `Upcoming activities:\n${members}`;
}

export function formatActivityDetails(rotation: RotationState) {
  return `Activity: ${rotation.activityName || "TBD"}\nActivity date: ${
    rotation.activityDate || "TBD"
  }`;
}
