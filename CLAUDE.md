# Forum Pet: working rules

- **Commit straight to `main` and push. Never open a pull request on this repo.** Commit subjects are conventional (`feat:`, `fix:`); the release drafter bumps from the subject.
- `js/dist` is committed and is what forums load. After any change under `js/src`, run `npm run build` in `js/` (from a fresh `npm ci`) and commit the bundle; CI fails if it is stale.
- Publishing a release is Ernest's click. Nothing is announced until he says so.

## Design rules that exist for a reason

- **Once a day is the database's job.** `forum_pet_care` has a unique key (user_id, day, kind); `Caretaking::care` inserts the row and increments `care_total` in one transaction, and a duplicate insert is answered `done: false`. Never check-then-insert.
- **Evolution is a conditional UPDATE** (`Caretaking::grow`: `WHERE stage = <stage read>`), so when two caretakers cross a threshold together exactly one is told it evolved. A lowered threshold can jump stages; every skipped stage gets its date.
- **"Today"** is `Clock::today()` in the admin's timezone setting (UTC if unknown). The state cache key carries the day, so it rolls over by itself.
- **The shared state is one cached array** (`State::shared`, 60 s, forgotten after every care, art change, reset and settings save). It holds the growth, activity (posts in 3 h vs a usual 3 h, hourly cache), today's counts and up to 60 caretakers, and the Festoon hat. `State::present` adds only the time-based mood/celebration and the viewer's own care (one indexed query, members only). Nothing per page may add a query beyond that.
- **Milestones** (`Milestones::handle` on `Posted`) compare the new post's id with the cached next milestone before counting anything: the count can only reach N after some id has. The real count runs at most once a minute, and the UPDATE is conditional.
- **Uploaded art is raster only** (PNG, GIF, WebP, JPEG), sniffed from the bytes: an SVG served from the forum's own domain can run script. It replaces the drawn pet from the baby stage on; the egg stays drawn.
- **Festoon is optional**: `Holiday` checks the class exists and the extension is enabled, and swallows anything Festoon throws. A member who switched Festoon decorations off gets no hat.
- Index and foreign key names in the care migration are short and carry the table prefix (Laravel's own names pass 64 characters under a long prefix; PostgreSQL and MySQL want them unique across forums sharing a database).
- **Art** (`js/src/common/art.tsx`) is plain functions called as functions, never JSX tags. Only elements with a `Pet-` class get `transform-box: fill-box`: putting it on every element moves the origin of the art's own `transform` attributes (the mirrored ear, the baby's scale). An element with a CSS animation loses its `transform` attribute, so put attribute transforms on a wrapper.
- forum.js wires the route, the nav link, the sidebar card (`forumPetCard`; the nav link is `forumPet`), the corner widget (mounted after the app, phones by default) and the banner. The art, the card's insides and the page are the lazy `pet` chunk, fetched when the browser is idle.
- Flarum's translator treats a `{user}` parameter as a User model: the member is `{member}`, the pet `{pet}`.

## Testing

- `composer test:setup && composer test` (integration; SQLite and prefixed MySQL both pass), `composer analyse:phpstan`.
- `cd js && npm ci && npm run build && npm run format-check`.
- The showcase seed is `~/github/showcase/seeds/98-forum-pet.php`; `~/github/scopes/forum-pet-shots/local-seed.php` runs it against ~/Herd/petdev, and `gallery.mjs` renders every species × stage × mood.
