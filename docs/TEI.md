# TEI/XML with the edition's assertions

`web/tei/nepos-assertions-tei.xml` is a TEI P5 file containing 26 texts, 176 chapters and 837 numbered sections and 139 assertions from `server/data/assertions.json`.

## Data model

The corpus-level `standOff` contains a flat `listAnnotation`. Each `annotation`
has the website assertion's identifier (for example `a-han-6`) and a `target`
containing its chapter identifiers. Its `ana` points to the topic taxonomy and
its `cert` copies the website's confidence. Assertions do not target or contain
other assertions.

Each annotation includes its English note, explicit references to person/place
registers and reader URLs, and a TEI feature structure preserving the complete
original JSON record. `fs`/`f` represent object fields; `string`, `numeric`,
`binary` and `vColl org="list"` preserve their types. Nested feature structures
encode dates, ranges and passage coordinates; they are not nested assertions.
All 177 original passage links resolve to 109 distinct source chapters.

Example identifiers:

- `text-pausanias`: the Pausanias source document.
- `chapter-pausanias-1`: Pausanias, chapter 1.
- `section-pausanias-1-3`: Pausanias 1.3.
- `r-con-3`: the assertion citing Themistocles 8 and Pausanias 3.
- `text-praefatio`: the complete Praefatio from the website reader.
- `section-praefatio-1`: its first numbered section.

The assertions cite chapters. Section identifiers do not assert that the
evidence has been checked or localized at section level. Negative year integers
retain the edition's BC convention; they have not been converted to XML Schema
dates. Confidence and historical classifications are reproduced without a new
scholarly reassessment. Classifications found only in the separate OWL file,
including `mannerOfDeath`, are not part of this website-data export.

All 30 person records and 114 place records are retained in registers. This does
not introduce `persName` or `placeName` tags into the source Latin text. The
Perseus editorial markup, including deletions, gaps and abbreviations, is kept.

## Source and encoding

The original XML, CTS metadata and repository notices are in `data/perseus/`.
They come from PerseusDL/canonical-latinLit commit
`128a05afa9cc7179ab18f8d05f78a9f1dd50e415`.
`data/perseus/provenance.json` records paths and SHA-256 hashes.

The Perseus text component is supplied under CC BY-SA 4.0 according to the
source repository. The original headers and licence notices are retained.
This export does not assign a new licence to the edition's assertion dataset.

The corpus adds unique work/chapter/section identifiers, disambiguates the 25
original `CTS` identifiers and adapts citation declarations to `teiCorpus`.
The unnumbered third chapter of Cato is assigned `n="3"`. These transformations
are recorded in the TEI header. Latin text nodes and editorial body elements
remain unchanged.

The XML validates against **TEI P5 4.12.0, `tei_all.rng`**. It is an enriched TEI
corpus, not an unchanged EpiDoc document: the original EpiDoc processing
instructions have therefore been replaced with the applicable TEI schema.
See `TEI-VALIDATION.json` for validation and round-trip results.

## Rebuild

The generator is JavaScript and uses Node.js built-in modules only. No npm
installation, Python runtime or frontend build is required:

```sh
node scripts/build-tei.mjs
```

It reads the original Perseus XML and the current `server/data` JSON records,
then writes the corpus and provenance manifest. Update `revisionDate` in the
script when intentionally preparing a new dated release. Validate the generated
XML against the pinned TEI schema after changing source data. The supplied
validation report describes this release, not subsequent local rebuilds.

