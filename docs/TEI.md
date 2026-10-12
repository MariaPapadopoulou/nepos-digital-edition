# TEI/XML with the edition's assertions

`web/tei/nepos-assertions-tei.xml` is a single TEI P5 `teiCorpus` containing
the 25 pinned Perseus `perseus-lat2` source documents and the complete Praefatio
from the website reader: 26 texts, 176 chapters and 837 numbered sections
(829 from Perseus plus the eight Praefatio units). All 139 assertions from
`server/data/assertions.json` are retained.

The Praefatio has separate, explicit provenance: the eight `life=praefatio`
records in `server/data/chapters.json`. Their exact text, spelling and punctuation
are preserved. The underlying printed edition has not been established from
this dataset, and the text is not attributed to the 25 Perseus XML files.
Its units are encoded as sections of a preface, with links to the corresponding
reader anchors. There are no assertions about the Praefatio in the source data;
none have been invented for this addition.

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

## What changes in the website

The reader header gains a **TEI/XML + assertions** link to `/tei/index.html`.
That page offers the enriched XML for download. The HTML entry point also
advertises the XML through `link rel="alternate"`.

The reader still uses its existing JavaScript text data and chapter navigation.
This update does not add section-level navigation to that reader. It preserves
the Themistocles 8 citation link, the Delphis LOC correction and author metadata.
The Node API, Ask Nepos and its configuration are not modified; Ask Nepos has
not been re-tested end to end as part of this static update.

The active script is `web/assets/index-nepos-tei-d88a69ac2792.js`. It is the
previous corrected compiled bundle with one reader-header link inserted. The
original frontend source project is still not part of this distribution.

## Update the existing server

Use the separate `nepos-tei-update.tar.gz`, which contains only the four changed
or added web files, their checksums and an installer. Do not upload the full
GitHub distribution over the live server's configuration.

In Windows **Command Prompt (CMD)**, after downloading the archive:

```bat
scp "%USERPROFILE%\Downloads\nepos-tei-update.tar.gz" maria@87.106.41.175:nepos-tei-update.tar.gz
ssh maria@87.106.41.175
```

Then, at the `maria@ubuntu:~$` prompt:

```sh
mkdir -p ~/nepos-tei-update
tar -xzf ~/nepos-tei-update.tar.gz -C ~/nepos-tei-update
sudo bash ~/nepos-tei-update/install-tei.sh
```

The installer verifies checksums, backs up `/var/www/nepos/web`, copies the XML,
resource page and new script, then activates the new index last. It prints the
backup path and a command to restore the previous entry page. It does not
restart the server or modify the API, credentials or proxy configuration.

Open `https://nepos.humanisticadigitalia.eu/tei/index.html`, test Download TEI/XML
and refresh a reader page with Ctrl+F5 to see the link. The static update does
not change the running server's `server/data` files.

## Update the GitHub repository with GitHub Desktop

1. Extract the new `nepos-github.zip`.
2. In GitHub Desktop select the existing Nepos repository and choose
   **Repository → Show in Explorer**.
3. Copy the **contents** of the extracted `nepos` folder into that repository
   folder, replacing matching files. Do not create another nested `nepos`
   folder. The ZIP contains no `.git` directory or API credentials.
4. Review Changes. Use the summary `Add enriched Perseus TEI and assertion download`.
5. Click **Commit to …**, then **Push origin**.

The full ZIP retains the corrected server data from the previous package.
Pushing these files to GitHub does not deploy them to the live server.
