# Lịch Học — Personal Timetable and Study Planner

A Vietnamese student planner with individual accounts, courses, class schedules, deadlines, exams, an installable PWA, and experimental timetable imports for UTH and FPT Quy Nhơn.

![Node.js 24+](https://img.shields.io/badge/Node.js-24%2B-339933?logo=node.js&logoColor=white)
![Database: SQLite](https://img.shields.io/badge/Database-SQLite-003B57?logo=sqlite&logoColor=white)
![Interface: Vietnamese](https://img.shields.io/badge/Interface-Vietnamese-2E49D0)

## Overview

Lịch Học brings a student's timetable, assignments, and exam dates into one place. Each new account starts with an empty schedule. Users enter their own school and semester information instead of editing sample data in the source code.

The interface uses plain HTML, CSS, and JavaScript. The backend uses Node.js built-in modules and SQLite, keeping the demo small and easy to run without external npm dependencies. The same interface serves as a Progressive Web App (PWA) for Android and iPhone.

The main integration challenge is reading authenticated school calendars with different layouts and date formats. A desktop extension reads the week that the student opens after signing in, shows a preview, and imports dated classes into their account. It does not turn one imported week into a recurring semester schedule.

> **Status:** local demo with automated tests. The UTH and FPT parsers have been tested with synthetic data and mocked DOM structures, but have **not been verified against live student accounts**. They may need adjustments for current portal layouts. A public HTTPS deployment is not included.

## Contents

- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Usage](#usage)
- [School timetable imports](#school-timetable-imports)
- [Mobile installation](#mobile-installation)
- [Configuration and deployment](#configuration-and-deployment)
- [Data and authentication](#data-and-authentication)
- [Tests](#tests)
- [Project structure](#project-structure)
- [Limitations and roadmap](#limitations-and-roadmap)
- [Contributing](#contributing)
- [Credits](#credits)
- [License](#license)

## Features

- Register, sign in, and sign out with account-specific schedules.
- Configure a school, semester name, Monday start date, and semester length.
- Add, edit, and delete courses, recurring classes, assignments, and exams.
- Track fixed due dates and mark assignments as submitted.
- Browse previous and upcoming weeks, including Sunday and evening classes.
- View a timetable grid on desktop and a daily agenda on smaller screens.
- Filter courses and switch between light and dark themes.
- Install the PWA with a home-screen icon and standalone window.
- Preview and import a visible week from UTH or FPT Quy Nhơn through the desktop extension.
- Update an imported week without duplicating classes or replacing manually entered schedules and other schools' schedules.

## Requirements

- **Node.js 24 or newer**, including npm.
- A modern browser for the web interface.
- Desktop Chrome or Edge for the import extension.
- An HTTPS deployment to install the PWA on a phone. Localhost supports development on the computer running the server.
- Optional: Python 3 to regenerate icons; only the standard library is used.

## Installation

```bash
git clone https://github.com/tuan0410/thoikhoabieu.git
cd thoikhoabieu
npm start
```

Open **http://localhost:3000**. No `npm install` or manual database setup is required for this version. The server creates its SQLite database on first launch.

If PowerShell blocks `npm.ps1`, use:

```powershell
npm.cmd start
```

Run the Node.js server rather than opening `index.html` directly or using Live Server: authentication and persistence require the API.

## Usage

1. Select **Đăng ký** to create an account, then sign in. There is no shared demo account or preconfigured password.
2. Open **Quản lý lịch cá nhân** and enter the school and semester information. The start date must be a Monday.
3. Add courses before creating classes, assignments, or exams that reference them.
4. Add recurring weekly classes with their day, start/end time, room, and class type.
5. Use **Bài tập và deadline** to create assignments and mark them as submitted.
6. Add tests and exams in the management page and view them under **Lịch kiểm tra và thi**.
7. Browse **Thời khóa biểu** to change weeks or hide courses.

For example, create a course named `Programming`, add a Monday class from `07:00` to `09:00`, and add an assignment with a due date. The class repeats within the configured semester; the assignment's due date does not move when you reopen the app.

## School timetable imports

**Update 0.3.0:** the FPT extension can collect a selected semester date range, preview all weeks, and submit one atomic import. Update the extension and restart the Node.js server first. See [semester setup and current portal compatibility](FPT_SYNC.md). UTH still uses visible-week import. Live FAP verification remains pending.

| Option | Portal | Demo workflow |
| --- | --- | --- |
| UTH | [portal.ut.edu.vn](https://portal.ut.edu.vn/) | Sign in, open the calendar, and read the visible week. |
| FPT Quy Nhơn | [fap.fpt.edu.vn](https://fap.fpt.edu.vn/) | Select **FU–Quy Nhơn**, sign in, and open **Weekly timetable**. |
| Other schools | Not configured | Enter schedules manually until a verified connector is added. |

1. On desktop, open **Đồng bộ lịch trường** and download the extension ZIP from that page.
2. Extract it, open `chrome://extensions` or `edge://extensions`, enable **Developer mode**, and choose **Load unpacked**. Select the folder containing `manifest.json`. You can also load the repository's [extension](extension/) directory directly.
3. If upgrading from the UTH-only extension, replace its files and press **Reload**. FPT requires version **0.2.0** or newer.
4. Reload Lịch Học, select a school, and click **Kết nối** to open its portal.
5. Sign in yourself, open the weekly timetable, and click **Đọc lịch tuần** in the Lịch Học panel.
6. Check the receiving account, subjects, dates, times, and rooms before clicking **Gửi về Lịch Học**.
7. Return to Lịch Học and select **Kiểm tra lại** or **Xem tuần vừa nhập**.

An import ticket lasts ten minutes, can be used once, and is tied to the Lịch Học user, login session, and selected school. The extension does not read or send school passwords, cookies, or authentication tokens. It does not automatically verify the student's identity or FAP campus; users must check the correct account and campus before sending.

The packaged extension connects only to `http://localhost:3000` and `http://127.0.0.1:3000` in the same browser/profile. For a hosted deployment, update its application origins and manifest matches before repackaging it. The ZIP is served at `/downloads/lichhoc-schools-extension.zip`; the earlier UTH URL remains available.

Detailed instructions: [UTH and shared workflow](SCHOOL_SYNC.md), [FPT Quy Nhơn](FPT_SYNC.md), and [extension setup](extension/README.md).

## Mobile installation

Deploy the application behind HTTPS first, then open that URL on the phone:

- **Android:** open in Chrome and use **Cài ứng dụng**, or the browser's **Install app / Add to Home screen** option.
- **iPhone/iPad:** open in Safari and select **Share → Add to Home Screen**.

The PWA uses the same server and accounts as the web interface. A phone's `localhost` points to the phone itself, not to the computer running Node.js.

The desktop extension does **not** run inside the mobile PWA. Import a school timetable on desktop, then sign into the same account on the phone using the same server to view the stored schedule.

Personal data requires a server connection. The service worker caches public interface assets only and displays a connection message when navigation fails offline; it does not cache API responses or personal calendars. See [MOBILE.md](MOBILE.md).

## Configuration and deployment

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port. |
| `HOST` | `127.0.0.1` | Listening interface. |
| `DB_PATH` | `data/lichhoc.sqlite` | Persistent database path. |
| `APP_ORIGIN` | Derived from the HTTP host | Exact public origin for request validation, without a trailing slash. |
| `NODE_ENV` | Unset | Set to `production` to enable Secure session cookies. |

Example PowerShell configuration behind an HTTPS reverse proxy:

```powershell
$env:NODE_ENV = 'production'
$env:APP_ORIGIN = 'https://your-domain.example'
$env:HOST = '127.0.0.1'
$env:PORT = '3000'
npm.cmd start
```

Replace the example origin with your domain. Configure the reverse proxy to forward HTTPS traffic to Node.js, and configure process supervision on your hosting platform. For containers, set `HOST` appropriately for the private container network and mount a persistent database volume.

This application needs a running Node.js API and persistent storage. **GitHub Pages alone cannot host the full application.**

Login rate limiting uses the direct connection IP. Behind a reverse proxy, users may share that limit; configure limits at the proxy before serving a larger audience. The server does not trust client-supplied `X-Forwarded-For` headers.

## Data and authentication

- Passwords are hashed using scrypt and a per-user salt; plaintext passwords are not stored.
- Sessions last seven days and use HttpOnly, SameSite cookies. Production cookies require HTTPS through the Secure attribute.
- Schedule reads and writes use the authenticated session's user ID.
- Version checks reject stale writes instead of silently overwriting another window's changes.
- Personal calendars are not stored in localStorage; it is used for the theme preference.
- The database persists across restarts and is excluded from version control.

Use SQLite backup facilities, or stop the server before copying database files. Copying only the `.sqlite` file during active WAL writes may miss recent changes. Do not expose the data directory through a public static server.

## Tests

```bash
npm test
```

Use `npm.cmd test` on Windows PowerShell if needed. Run the suite to see the current test count, including nested API tests.

Coverage includes account isolation, session revocation, restart persistence, API validation, conflicting updates, timetable dates, HTML escaping, form drafts, PWA resources and cache exclusions, school-specific import tickets, parser fixtures, and duplicate-free imports. Parser and extension mocks do not replace testing with live school accounts or actual phone/browser installations.

Regenerate application icons without external Python packages:

```bash
python scripts/make_icons.py
```

## Project structure

```text
├── index.html, style.css       # Web interface
├── js/                        # State, API, navigation, PWA, and page views
├── server.cjs                 # Authentication, schedule API, and static assets
├── lib/school-sync.cjs         # School catalog and import merge rules
├── extension/                 # Chrome/Edge bridge and school parsers
├── downloads/                 # Packaged demo extension
├── icons/                     # PWA and Apple home-screen icons
├── manifest.webmanifest       # Installable app metadata
├── sw.js, offline.html        # Public shell caching and offline message
├── scripts/                   # Icon generation
├── tests/                     # Node.js test suite
└── data/                      # Created at runtime; gitignored
```

## Limitations and roadmap

| Current limitation | Next step |
| --- | --- |
| UTH/FAP parsers have not been verified with live accounts. | Validate authorized, anonymized samples and adjust selectors. |
| Imports read one visible week; empty weeks are rejected to avoid accidental deletion. | Add verified cancellation handling and multi-week updates. |
| No background sync, exam imports, or LMS deadline imports. | Extend connectors after verifying their source data. |
| The PWA needs a connection for personal data and has no push reminders. | Design offline calendar access and notification permissions. |
| Email is a login identifier without verification or reset emails. | Add email ownership verification and account recovery. |
| One active semester; manually entered classes recur throughout it. | Add semester history, holidays, and recurrence exceptions. |
| SQLite and in-process rate limits target a single server. | Introduce shared infrastructure if multiple instances are needed. |

## Contributing

Open an issue with reproduction steps and expected behavior before proposing a larger change. Keep pull requests focused, run `npm test`, and update documentation when workflows change.

For school connectors, include anonymized fixtures and tests for dates, times, changed classes, and repeated imports. Never submit passwords, session cookies, bearer tokens, database files, or unredacted student records.

## Credits

- Maintained by [tuan0410](https://github.com/tuan0410).
- Official school references: [UTH student information](https://iec.ut.edu.vn/vi/cac-kenh-thong-tin-lien-he-ve-dao-tao-cong-tac-sinh-vien-chuong-trinh-hoan-toan-tieng-anh/) and [FPT Quy Nhơn IT guidance](https://lmsqn.fpt.edu.vn/hd/wp-content/uploads/2021/09/HUONG-DAN-CNTT-FPTU.QN-09.2021.pdf).
- Community projects consulted for portal layout information: [UTH Portal Helper](https://github.com/ThinhNguyen2005/extensions_uth_helper) and [FPTU Schedule](https://github.com/yunkhngn/fptu-schedule). These are community references, not official integration APIs or endorsements.
- Platform documentation: [Chrome extensions](https://developer.chrome.com/docs/extensions/) and [PWA installation](https://web.dev/learn/pwa/installation/).
- Interface fonts: Be Vietnam Pro and Bricolage Grotesque, loaded through Google Fonts.

## License

A project license has not been selected, and this repository does not currently include a `LICENSE` file. A license should be added explicitly by the maintainer rather than assumed from referenced projects.
