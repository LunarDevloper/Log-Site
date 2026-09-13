const icons = {
  dashboard: "M3 3h7v7H3z M14 3h7v4h-7z M14 11h7v10h-7z M3 14h7v7H3z",
  stock: "M4 7l8-4 8 4-8 4z M4 7v10l8 4 8-4V7 M12 11v10",
  movements: "M7 7h11 M14 3l4 4-4 4 M17 17H6 M10 13l-4 4 4 4",
  orders: "M7 3h10v4H7z M5 7h14v14H5z M8 11h8 M8 15h6",
  robots: "M8 7h8a3 3 0 013 3v7a3 3 0 01-3 3H8a3 3 0 01-3-3v-7a3 3 0 013-3z M12 3v4 M9 13h.01 M15 13h.01 M9 17h6",
  alerts: "M12 3l10 18H2z M12 9v5 M12 18h.01",
  reports: "M5 20V10 M12 20V4 M19 20v-7",
  settings: "M12 15a3 3 0 100-6 3 3 0 000 6z M19 12a7 7 0 00-.1-1l2-1.5-2-3.4-2.3.8a7 7 0 00-1.7-1L16.5 3h-4L12 5.5a7 7 0 00-1.7 1L8 6.5l-2 3.4L8.1 11a7 7 0 000 2L6 14.1l2 3.4 2.3-.8a7 7 0 001.7 1l.5 2.5h4l.5-2.5a7 7 0 001.7-1l2.3.8 2-3.4-2.1-1.1a7 7 0 00.1-1z",
  menu: "M4 6h16 M4 12h16 M4 18h16",
  search: "M11 19a8 8 0 100-16 8 8 0 000 16z M21 21l-4.35-4.35",
  bell: "M18 8a6 6 0 00-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4",
  team: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M9 11a4 4 0 100-8 4 4 0 000 8z M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75",
  company: "M3 21h18 M5 21V7l7-4 7 4v14 M9 9h.01 M9 13h.01 M9 17h.01 M15 9h.01 M15 13h.01 M15 17h.01",
};

export default function Icon({ name, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={icons[name] || icons.dashboard} />
    </svg>
  );
}
