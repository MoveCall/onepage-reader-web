# Third-Party Notices

This document identifies third-party material used by the OnePage website and
its browser font builder. These notices apply to the named components only.
They do not state that the OnePage project, OnePage firmware, or CrossPoint
Reader firmware as a whole is governed by these third-party terms.

## CrossPoint Tools converter logic

The `.cpfont` v4 writer and character-range behavior in the browser font
builder are based on converter logic from
[CrossPoint Tools](https://github.com/crosspoint-reader/crosspoint-tools/tree/7f341c7b3514056c983f5a2e62a1d7884a7a113a),
reference commit `7f341c7b3514056c983f5a2e62a1d7884a7a113a`.

CrossPoint Tools is licensed under the MIT License:

```text
MIT License

Copyright (c) 2025 SoFriendly

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
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

## FreeType WebAssembly

The font builder uses
[`@zkl2333/freetype-wasm`](https://github.com/zkl2333/freetype-wasm) version
`2.14.3`. Its JavaScript wrapper, build scripts, and configuration are licensed
under the MIT License. The complete package notice is shipped at
[`public/licenses/freetype-wasm/LICENSE`](public/licenses/freetype-wasm/LICENSE)
and becomes `licenses/freetype-wasm/LICENSE` in the generated static site.

The distributed WebAssembly binary also contains FreeType and its Brotli and
zlib dependencies. Their complete notices are shipped unchanged from the
installed `@zkl2333/freetype-wasm` package:

| Component | Repository asset | Path in the generated site |
| --- | --- | --- |
| FreeType license overview | [`public/licenses/freetype-wasm/licenses/FreeType-LICENSE.txt`](public/licenses/freetype-wasm/licenses/FreeType-LICENSE.txt) | `licenses/freetype-wasm/licenses/FreeType-LICENSE.txt` |
| FreeType License (FTL) | [`public/licenses/freetype-wasm/licenses/FreeType-FTL.txt`](public/licenses/freetype-wasm/licenses/FreeType-FTL.txt) | `licenses/freetype-wasm/licenses/FreeType-FTL.txt` |
| Brotli | [`public/licenses/freetype-wasm/licenses/Brotli-LICENSE.txt`](public/licenses/freetype-wasm/licenses/Brotli-LICENSE.txt) | `licenses/freetype-wasm/licenses/Brotli-LICENSE.txt` |
| zlib | [`public/licenses/freetype-wasm/licenses/zlib-LICENSE.txt`](public/licenses/freetype-wasm/licenses/zlib-LICENSE.txt) | `licenses/freetype-wasm/licenses/zlib-LICENSE.txt` |

Portions of this software are copyright © The FreeType Project (www.freetype.org). All rights reserved.

## ABeeZee test fixture

[`tests/fixtures/fonts/ABeeZee-Regular.ttf`](tests/fixtures/fonts/ABeeZee-Regular.ttf)
is used only as an automated test fixture. ABeeZee is copyright 2011 The
ABeeZee Project Authors, with Reserved Font Name "ABeeZee", and is licensed
under the SIL Open Font License 1.1. The complete license is included at
[`tests/fixtures/fonts/OFL.txt`](tests/fixtures/fonts/OFL.txt).

`SubsetPrimary-A.ttf`, `SubsetFallback-B.ttf`, and `SubsetCjk-U4E00.ttf` in the
same fixture directory are tiny derivatives generated from ABeeZee solely to
exercise real fallback and CJK-codepoint coverage. Their font names are
obfuscated so the Reserved Font Name is not used; they remain under the same
SIL Open Font License 1.1.
