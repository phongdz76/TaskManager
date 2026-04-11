import {
  LuLayoutDashboard,
  LuSquarePlus,
  LuClipboardCheck,
  LuUsers,
  LuUserCog,
  LuListTodo,
  LuCircleUser,
  LuLogOut,
} from "react-icons/lu";

export const ADMIN_SIDE_MENU_DATA = [
  {
    id: "01",
    label: "Dashboard",
    icon: LuLayoutDashboard,
    path: "/admin/dashboard",
  },
  {
    id: "02",
    label: "Manager All Task",
    icon: LuListTodo,
    path: "/admin/all-user-tasks",
  },
  {
    id: "03",
    label: "Create Task",
    icon: LuSquarePlus,
    path: "/admin/create-task",
  },
  {
    id: "04",
    label: "Manager My Task",
    icon: LuClipboardCheck,
    path: "/admin/tasks",
  },
  {
    id: "05",
    label: "Team Members",
    icon: LuUsers,
    path: "/admin/team-members",
  },
  {
    id: "06",
    label: "Manager User",
    icon: LuUserCog,
    path: "/admin/users",
  },
  {
    id: "07",
    label: "Profile",
    icon: LuCircleUser,
    path: "/admin/profile",
  },
  {
    id: "08",
    label: "Logout",
    icon: LuLogOut,
    path: "/logout",
  },
];

export const USER_SIDE_MENU_DATA = [
  {
    id: "01",
    label: "Dashboard",
    icon: LuLayoutDashboard,
    path: "/user/dashboard",
  },
  {
    id: "02",
    label: "Create Task",
    icon: LuSquarePlus,
    path: "/user/create-task",
  },
  {
    id: "03",
    label: "My Tasks",
    icon: LuClipboardCheck,
    path: "/user/my-tasks",
  },
  {
    id: "04",
    label: "Team Members",
    icon: LuUsers,
    path: "/user/team-members",
  },
  {
    id: "05",
    label: "Profile",
    icon: LuCircleUser,
    path: "/user/profile",
  },
  {
    id: "06",
    label: "Logout",
    icon: LuLogOut,
    path: "/logout",
  },
];

const SIDE_MENU_DATA = {
  admin: ADMIN_SIDE_MENU_DATA,
  user: USER_SIDE_MENU_DATA,
};

export const PRIORITY_DATA = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
];

export const STATUS_DATA = [
  { label: "Pending", value: "Pending" },
  { label: "In Progress", value: "In Progress" },
  { label: "Completed", value: "Completed" },
];

export default SIDE_MENU_DATA;
