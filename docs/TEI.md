# TEI/XML with the edition's assertions

`web/tei/nepos-assertions-tei.xml` is a TEI P5 `teiCorpus` containing **26 texts, 176 chapters, 837 numbered sections and 139 assertions**.

It combines 25 Perseus XML documents with the Praefatio from the edition’s reader. The Praefatio comprises eight units from `server/data/chapters.json`; its underlying printed edition has not been established.

Assertions from `server/data/assertions.json` are encoded as independent stand-off annotations targeting chapters. Each preserves its identifier, topic, confidence, note and complete JSON record through TEI feature structures. Section identifiers provide reference points; assertion evidence remains linked at chapter level. Person and place registers are included without adding name tags to the Latin text. Classifications found only in the separate OWL dataset are excluded.

The Perseus sources, licence notices and provenance hashes are retained in `data/perseus/`. Their Latin text and editorial markup are preserved. Encoding changes add unique identifiers, adapt citation declarations and number the previously unnumbered third chapter of Cato. The Perseus component carries the repository’s CC BY-SA 4.0 licence; no new licence is assigned to the assertion dataset.

The supplied XML validates against **TEI P5 4.12.0 (`tei_all.rng`)**. Validation and data-preservation results are recorded in `docs/TEI-VALIDATION.json`.

To rebuild, run from the repository root:

```sh
node scripts/build-tei.mjs
```

The generator uses Node.js built-in modules only. After changing source data, revalidate the output; the supplied validation report applies to this release.

