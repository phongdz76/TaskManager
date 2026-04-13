import React from "react";
import useUserAuth from "../../hooks/useUserAuth";
import TeamMembersView from "../../components/team/TeamMembersView";

export default function UserTeamMembers() {
  useUserAuth();

  return (
    <TeamMembersView
      activeMenu="Team Members"
      subtitle="See all workspace members and their overall completion level."
    />
  );
}
