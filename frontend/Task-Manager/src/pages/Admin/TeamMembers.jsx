import React from "react";
import useUserAuth from "../../hooks/useUserAuth";
import TeamMembersView from "../../components/team/TeamMembersView";

export default function TeamMembers() {
  useUserAuth();

  return (
    <TeamMembersView
      activeMenu="Team Members"
      subtitle="View members that appear in tasks across your workspace."
    />
  );
}
