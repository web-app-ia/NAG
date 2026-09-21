/*!

=========================================================
* Light Bootstrap Dashboard React - v2.0.1
=========================================================

* Product Page: https://www.creative-tim.com/product/light-bootstrap-dashboard-react
* Copyright 2022 Creative Tim (https://www.creative-tim.com)
* Licensed under MIT (https://github.com/creativetimofficial/light-bootstrap-dashboard-react/blob/master/LICENSE.md)

* Coded by Creative Tim

=========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

*/
import React, { useState, useEffect } from 'react';
import Dashboard from "views/Dashboard.js";
import UserProfile from "views/UserProfile.js";
import TableList from "views/TableList.js";
import Typography from "views/Typography.js";
import Icons from "views/Icons.js";
import Maps from "views/Maps.js";
import Notifications from "views/Notifications.js";
import Upgrade from "views/Upgrade.js";
import Test from "views/Test.js";
import { Attendee } from "components/Register/Attendee";
// Vues lourdes chargees a la demande (code-splitting).
const CustomizeAvatar = React.lazy(() => import("views/CustomizeAvatar"));
const GetExhibitions = React.lazy(() =>
  import("components/Exhibitions/GetExhibitions")
);
import RegisterAdmin from "views/RegisterAdmin";
const StallsSelect = React.lazy(() => import("views/StallsSelect"));
const CustomizeStall = React.lazy(() => import("views/CustomizeStall"));
const LiveStream = React.lazy(() => import("views/liveStream"));
// Stat importe chart.js + react-chartjs-2 : charge a la demande.
const Stat = React.lazy(() => import("views/Stat"));
// Editeur de hall (conception de l'espace) : charge a la demande.
const HallBuilder = React.lazy(() => import("components/ExhibitionMap/HallBuilder"));
const UserManager = React.lazy(() => import("views/UserManager"));
const AgendaAdmin = React.lazy(() => import("views/AgendaAdmin"));
import AddExhibition from "views/AddExhibition";
import ApproveExhibitors from 'views/ApproveExhibitors';
import SubmitFeedback from 'views/SubmitFeedback';
import ViewFeedbacks from 'views/ViewFeedbacks';
import ViewMaterials from 'views/ViewMaterials';
import PlattformFB from 'views/PlattformFB';
import Approve from 'views/Approve';
import StartExhibitions from 'views/StartExhibitions';
const VisitExhibition = React.lazy(() => import("views/VisitExhibition"));

export function getDashboardRoutes() {
  const currentRole = localStorage.getItem("userRole");
  switch (currentRole) {
    case "ADMIN":
      return [
        {
          path: "/user",
          name: "User Profile",
          icon: "nc-icon nc-circle-09",
          component: UserProfile,
          layout: "/admin"
        },
        {
          path: '/hallBuilder',
          name: "Hall Builder",
          icon: "nc-icon nc-ruler-pencil",
          component: HallBuilder,
          layout: "/admin"
        },
        {
          path: "/users",
          name: "Community Management",
          icon: "nc-icon nc-single-02",
          component: UserManager,
          layout: "/admin"
        },
        {
          path: "/agenda",
          name: "Conference Agenda",
          icon: "nc-icon nc-calendar-60",
          component: AgendaAdmin,
          layout: "/admin"
        },
        {
          path: "/startExhibitions",
          name: "Start / Stop Exhibitions",
          icon: "nc-icon nc-button-play",
          component: StartExhibitions,
          layout: "/admin"
        },
        {
          path: "/registerAdmin",
          name: "Register Admins",
          icon: "nc-icon nc-simple-add",
          component: RegisterAdmin,
          layout: ""
        },
        {
          path: "/plattformFeedback",
          name: "Plattform Feedbacks",
          icon: "nc-icon nc-chat-round",
          component: PlattformFB,
          layout: "/admin"
        },
        {
          path: '/exhibitions',
          name: "Exhibitions",
          icon: "nc-icon nc-tv-2",
          component: GetExhibitions,
          layout: "/admin"
        },
        {
          path: '/visit-exhibition',
          name: "Visit Exhibition",
          icon: "nc-icon nc-planet",
          component: VisitExhibition,
          layout: ""
        },
        {
          path: '/approve',
          name: "Approve Exhibitions",
          icon: "nc-icon nc-check-2",
          component: Approve,
          layout: "/admin"
        },
        {
          path: '/stat',
          name: "Stats",
          icon: "nc-icon nc-chart-bar-32",
          component: Stat,
          layout: "/admin"
        },
      ];

    case "EX_OWNER":
      return [
        {
          path: "/user",
          name: "User Profile",
          icon: "nc-icon nc-circle-09",
          component: UserProfile,
          layout: "/admin"
        },
        {
          path: "/users",
          name: "Community Management",
          icon: "nc-icon nc-single-02",
          component: UserManager,
          layout: "/admin"
        },
        {
          path: "/agenda",
          name: "Conference Agenda",
          icon: "nc-icon nc-calendar-60",
          component: AgendaAdmin,
          layout: "/admin"
        },
        {
          path: "/startExhibitions",
          name: "Start / Stop Exhibitions",
          icon: "nc-icon nc-button-play",
          component: StartExhibitions,
          layout: "/admin"
        },
        {
          path: "/approve",
          name: "Approve Exhibitors",
          icon: "nc-icon nc-check-2",
          component: ApproveExhibitors,
          layout: "/admin"
        },
        {
          path: '/exhibitions',
          name: "Exhibitions",
          icon: "nc-icon nc-tv-2",
          component: GetExhibitions,
          layout: "/admin"
        },
        {
          path: '/visit-exhibition',
          name: "Visit Exhibition",
          icon: "nc-icon nc-planet",
          component: VisitExhibition,
          layout: ""
        },
        {
          path: "/addExhibition",
          name: "Add Exhibition",
          icon: "nc-icon nc-simple-add",
          component: AddExhibition,
          layout: ""
        },
        {
          path: "/submitFeedback",
          name: "Submit Feedback",
          icon: "nc-icon nc-notes",
          component: SubmitFeedback,
          layout: "/admin"
        },
        {
          path: "/viewFeedback",
          name: "View Feedbacks",
          icon: "nc-icon nc-chat-round",
          component: ViewFeedbacks,
          layout: "/admin"
        },
      ];

    case "EXHIBITOR":
      return [
        {
          path: "/user",
          name: "User Profile",
          icon: "nc-icon nc-circle-09",
          component: UserProfile,
          layout: "/admin"
        },
        {
          path: "/stalls-select",
          name: "Select Stall",
          icon: "nc-icon nc-tap-01",
          component: StallsSelect,
          layout: ""
        },
        {
          path: "/customize-stall",
          name: "Customize Stall",
          icon: "nc-icon nc-palette",
          component: CustomizeStall,
          layout: ""
        },
        {
          path: "/viewMaterials",
          name: "View Materials",
          icon: "nc-icon nc-cloud-download-93",
          component: ViewMaterials,
          layout: "/admin"
        },
        {
          path: "/live-streaming",
          name: "Live Streaming",
          icon: "nc-icon nc-button-play",
          component: LiveStream,
          layout: ""
        },
        {
          path: '/exhibitions',
          name: "Exhibitions",
          icon: "nc-icon nc-tv-2",
          component: GetExhibitions,
          layout: "/admin"
        },
        {
          path: "/submitFeedback",
          name: "Submit Feedback",
          icon: "nc-icon nc-notes",
          component: SubmitFeedback,
          layout: "/admin"
        },
      ];

    case "ATTENDEE":
      return [
        {
          path: "/user",
          name: "User Profile",
          icon: "nc-icon nc-circle-09",
          component: UserProfile,
          layout: "/admin"
        },
        {
          path: '/customize-avatar',
          name: "Customize Avatar",
          icon: "nc-icon nc-palette",
          component: CustomizeAvatar,
          layout: ""
        },
        {
          path: '/exhibitions',
          name: "Exhibitions",
          icon: "nc-icon nc-tv-2",
          component: GetExhibitions,
          layout: "/admin"
        },
        {
          path: "/submitFeedback",
          name: "Submit Feedback",
          icon: "nc-icon nc-notes",
          component: SubmitFeedback,
          layout: "/admin"
        },
      ];

    default:
      return [
        {
          path: "/user",
          name: "User Profile",
          icon: "nc-icon nc-circle-09",
          component: UserProfile,
          layout: "/admin"
        },
        {
          path: '/exhibitions',
          name: "Exhibitions",
          icon: "nc-icon nc-tv-2",
          component: GetExhibitions,
          layout: "/admin"
        },
      ];
  }
}

// Proxy array so imported `routes` always accesses the current userRole routes
const dashboardRoutes = new Proxy([], {
  get(target, prop, receiver) {
    const list = getDashboardRoutes();
    if (prop === "length") return list.length;
    if (prop === Symbol.iterator) return list[Symbol.iterator].bind(list);
    if (typeof list[prop] === "function") return list[prop].bind(list);
    return list[prop];
  }
});

export default dashboardRoutes;

// const dashboardRoutes = [
//   {
//     path: "/dashboard",
//     name: "Dashboard",
//     icon: "nc-icon nc-chart-pie-35",
//     component: Dashboard,
//     layout: "/admin"
//   },
//   {
//     path: "/user",
//     name: "User Profile",
//     icon: "nc-icon nc-circle-09",
//     component: UserProfile,
//     layout: "/admin"
//   },
//   {
//     path: "/table",
//     name: "Table List",
//     icon: "nc-icon nc-notes",
//     component: TableList,
//     layout: "/admin"
//   },
//   {
//     path: "/typography",
//     name: "Typography",
//     icon: "nc-icon nc-paper-2",
//     component: Typography,
//     layout: "/admin"
//   },
//   {
//     path: "/icons",
//     name: "Icons",
//     icon: "nc-icon nc-atom",
//     component: Icons,
//     layout: "/admin"
//   },
//   {
//     path: "/maps",
//     name: "Maps",
//     icon: "nc-icon nc-pin-3",
//     component: Maps,
//     layout: "/admin"
//   },
//   {
//     path: "/notifications",
//     name: "Notifications",
//     icon: "nc-icon nc-bell-55",
//     component: Notifications,
//     layout: "/admin"
//   }
// ];
// export default dashboardRoutes;

