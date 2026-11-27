# Notices

**openHybrid** — Copyright (C) 2026 the openHybrid contributors.

openHybrid is free software: you can redistribute it and/or modify it under the
terms of the **GNU Affero General Public License, version 3 only**
(`AGPL-3.0-only`). The full licence text is in [LICENSE](LICENSE).

The corresponding source for the hosted PWA and the Android app is this
repository: <https://github.com/mjb96/openHybrid>.

## Third-party components

openHybrid distributes the following third-party code. Their licences are compatible
with the AGPL; the notices below are kept with the distributed application.

### Leaflet 1.9.4 — BSD-2-Clause

Map rendering for GPS routes (`js/vendor/leaflet/`).

Copyright (c) 2010-2024, Volodymyr Agafonkin.
Copyright (c) 2010-2011, CloudMade.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

### fit-file-parser 3.1.3 — MIT

FIT-file import, bundled into `js/vendor/fit-parser.js` by
`scripts/vendor-fit.mjs`.

Copyright (c) 2015-2024, Mattias Levin.

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

### buffer 6.0.3 — MIT

Browser Buffer polyfill bundled with `fit-file-parser` (`js/vendor/fit-parser.js`).

Copyright (c) Feross Aboukhadijeh, and other contributors.

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Exercise catalogue

The core catalogue (the first 157 entries) is original openHybrid text. The
extended catalogue in `js/exercises/opengym-catalogue.js` is **metadata only**
(names, source ids, muscles and equipment) derived from the
[openGym exercise catalogue](https://github.com/DuarteSantos8/openGym):

- **openGym-authored text** (newer exercises, descriptions, muscle-map
  corrections and translations) is Copyright (C) 2026 Duarte Santos and openGym
  contributors, licensed **AGPL-3.0** (the same licence as openHybrid).
- Entries marked `textSource: "exercisedb"` (the 1,324 exercises openGym shipped
  before v1.4.0) keep metadata that originates from
  [ExerciseDB v1](https://exercisedb.dev/) by AscendAPI and reached openGym
  through [hasaneyldrm/exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset),
  under the MIT licence reproduced below.

No imported instructional text, descriptions or openGym exercise media (GIFs,
animations or Gym-visual stills) are shipped. Form guidance comes only from the
reviewed core catalogue. openGym's media is separately licensed to Gym visual
and is not AGPL.

### Free Exercise DB — Unlicense (public domain)

`assets/exercises/*.webp` contains two demonstration stills for 142 of the 157
core lifts, from [Free Exercise DB](https://github.com/yuhonas/free-exercise-db)
by yuhonas, released under the Unlicense (public domain dedication). The mapping
is `js/exercises/media.js`; the source exercise's name is captioned where it
differs from ours. These are stills, not animations.

```
MIT License

Copyright (c) 2026 Hasan Emir Yıldırım

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation and data files (the "Software"),
to deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

Regenerate with `scripts/import-opengym-catalogue.mjs`; see
[`docs/EXERCISE_LIBRARY.md`](docs/EXERCISE_LIBRARY.md).

## Body Muscles — Apache-2.0 (session body-map geometry)

`js/home/body-paths.js` vendors the static SVG path geometry from
[Body Muscles](https://github.com/vulovix/body-muscles) for the session muscle
heat map.

The upstream project ships this NOTICE, reproduced verbatim:

```
Body Muscles
Copyright 2024 Ivan Vulović

This product includes software developed by Ivan Vulović.
https://github.com/vulovix/body-muscles
```

Licensed under the Apache License, Version 2.0. The full licence text is in
[`LICENSES/Apache-2.0.txt`](LICENSES/Apache-2.0.txt).

Modifications: only the static path data is used; the library runtime is not
included. openHybrid crops the shared source coordinate space into separate
front and back views and recolours every region with its own credit-weighted
heat model. No openGym or Gym-visual media is used.
