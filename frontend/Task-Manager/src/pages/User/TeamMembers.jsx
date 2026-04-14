import React from "react";
import useUserAuth from "../../hooks/useUserAuth";
import TeamMembersView from "../../components/team/TeamMembersView";

export default function UserTeamMembers() {
  useUserAuth();

  return (
    <TeamMembersView
      activeMenu="Team Members"
      subtitle="See members who share tasks with you and your shared task count."
    />
  );
}
