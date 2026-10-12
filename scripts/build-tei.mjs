#!/usr/bin/env node
// Rebuild the enriched TEI using only Node.js built-in modules.
// Input: the pinned Perseus XML in data/perseus and the edition's JSON data.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const commit = '128a05afa9cc7179ab18f8d05f78a9f1dd50e415';
const revisionDate = '2026-10-12';
const ns = 'http://www.tei-c.org/ns/1.0';
const lifeIds = ['miltiades', 'themistocles', 'aristides', 'pausanias', 'cimon', 'lysander', 'alcibiades', 'thrasybulus', 'conon', 'dion', 'iphicrates', 'chabrias', 'timotheus', 'datames', 'epaminondas', 'pelopidas', 'agesilaus', 'eumenes', 'phocion', 'timoleon', 'de-regibus', 'hamilcar', 'hannibal', 'cato', 'atticus'];
const readData = name => JSON.parse(fs.readFileSync(path.join(root, 'server/data', `${name}.json`), 'utf8'));
const assertions = readData('assertions');
const people = readData('persons');
const places = readData('places');
const lives = readData('lives');
const readerChapters = readData('chapters');
const personMap = new Map(people.map(p => [p.id, p]));
const placeMap = new Map(places.map(p => [p.id, p]));
const lifeMap = new Map(lives.map(l => [l.id, l]));
const escape = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const attr = s => escape(s);
const sha256 = b => crypto.createHash('sha256').update(b).digest('hex');
const chapterId = (life, n) => `chapter-${life}-${n}`;
const topics = [...new Set(assertions.map(a => a.topic))];

// A lossless, typed XML representation of a JSON value using TEI feature structures.
// Nested records represent dates and passage coordinates, never nested assertions.
function featureValue(value) {
  if (value === null) return '<symbol value="null"/>';
  if (typeof value === 'string') return `<string>${escape(value)}</string>`;
  if (typeof value === 'number') return `<numeric value="${value}"/>`;
  if (typeof value === 'boolean') return `<binary value="${value}"/>`;
  if (Array.isArray(value)) return `<vColl org="list">${value.map(featureValue).join('')}</vColl>`;
  return featureStructure(value, 'record');
}
function featureStructure(record, type) {
  return `<fs type="${attr(type)}">${Object.entries(record).map(([name, value]) => `<f name="${attr(name)}">${featureValue(value)}</f>`).join('')}</fs>`;
}
function externalIds(item) {
  return [item.wikidata && ['Wikidata', `https://www.wikidata.org/entity/${item.wikidata}`], item.pleiades && ['Pleiades', `https://pleiades.stoa.org/places/${item.pleiades}`], item.dbpedia && ['DBpedia', `https://dbpedia.org/resource/${encodeURIComponent(item.dbpedia)}`]]
    .filter(Boolean).map(([type, value]) => `<idno type="${type}">${escape(value)}</idno>`).join('');
}

const allChapters = new Set();
let sectionCount = 0;
const sourceManifest = [];
const documents = lifeIds.map((life, index) => {
  const work = `abo${String(index + 1).padStart(3, '0')}`;
  const relative = `data/perseus/phi0588/${work}/phi0588.${work}.perseus-lat2.xml`;
  const original = fs.readFileSync(path.join(root, relative), 'utf8');
  sourceManifest.push({ life, path: relative, sha256: sha256(original), source: `https://github.com/PerseusDL/canonical-latinLit/blob/${commit}/${relative.replace('data/perseus/', 'data/')}` });
  // Drop the source's prolog (EpiDoc schema declarations); retain the TEI root and all its content.
  const start = original.indexOf('<TEI ');
  const end = original.lastIndexOf('</TEI>');
  if (start < 0 || end < 0) throw Error(`Unexpected Perseus document: ${relative}`);
  let xml = original.slice(start, end + 6);
  xml = xml.replace('<TEI ', `<TEI xml:id="text-${life}" `);
  xml = xml.replaceAll('xml:id="CTS"', `xml:id="CTS-${life}"`);
  xml = xml.replaceAll('/tei:TEI/tei:text/tei:body', `/tei:teiCorpus/tei:TEI[@xml:id='text-${life}']/tei:text/tei:body`);
  xml = xml.replace('match="/TEI/text/body"', `match="/teiCorpus/TEI[@xml:id='text-${life}']/text/body"`);
  const citation = '<citeStructure unit="chapter" delim=":" match="div/div[@subtype=\'chapter\']" use="@n"/>';
  if (!xml.includes(citation)) throw Error(`Unexpected citation declaration: ${life}`);
  xml = xml.replace(citation, '<citeStructure unit="chapter" delim=":" match="div/div[@subtype=\'chapter\']" use="@n"><citeStructure unit="section" delim="." match=".//seg[@type=\'section\']" use="@n"/></citeStructure>');
  let currentChapter = null;
  let chapterCount = 0;
  const sourceSectionIds = new Set();
  xml = xml.replace(/<div\b[^>]*>|<seg\b[^>]*>/g, tag => {
    if (/^<div\b/.test(tag) && /subtype="chapter"/.test(tag)) {
      chapterCount++;
      const n = tag.match(/\bn="([^"]+)"/);
      currentChapter = n ? n[1] : null;
      // The source's third Cato chapter lacks @n. Restore the unambiguous sequence number.
      if (currentChapter === null && life === 'cato' && chapterCount === 3) {
        currentChapter = '3';
        tag = tag.slice(0, -1) + ' n="3">';
      }
      if (currentChapter === null) throw Error(`Unnumbered chapter: ${life}`);
      const id = chapterId(life, currentChapter);
      if (allChapters.has(id)) throw Error(`Duplicate chapter: ${id}`);
      allChapters.add(id);
      return tag.slice(0, -1) + ` xml:id="${id}">`;
    }
    if (/^<seg\b/.test(tag) && /type="section"/.test(tag)) {
      const n = tag.match(/\bn="([^"]+)"/);
      if (!n || currentChapter === null) throw Error(`Unnumbered section: ${life}`);
      const id = `section-${life}-${currentChapter}-${n[1]}`;
      if (sourceSectionIds.has(id)) throw Error(`Duplicate section: ${id}`);
      sourceSectionIds.add(id);
      sectionCount++;
      return tag.slice(0, -1) + ` xml:id="${id}">`;
    }
    return tag;
  });
  const change = `<change when="${revisionDate}">Included in the Nepos assertion corpus; stable work, chapter and section identifiers added; CTS declarations adapted to the corpus structure.${life === 'cato' ? ' The unnumbered third chapter has been assigned n=3.' : ''} The Latin text and its editorial markup are preserved.</change>`;
  if (!xml.includes('<revisionDesc>')) throw Error(`Missing revision history: ${life}`);
  return xml.replace('<revisionDesc>', '<revisionDesc>\n      ' + change);
});

// The Praefatio is supplied by this edition's reader, separately attributed
// from the 25 pinned Perseus documents. Preserve every source text segment.
const prefaceUnits = readerChapters.filter(c => c.life === 'praefatio');
if (prefaceUnits.length !== 8 || prefaceUnits.some((c, i) => c.localN !== i + 1)) {
  throw Error('Expected the eight numbered Praefatio units from the edition reader');
}
const prefaceParagraphs = prefaceUnits.map(c => {
  if (c.segments.some(s => typeof s.s !== 'string')) throw Error('Invalid Praefatio text segment');
  const text = c.segments.map(s => s.s).join('');
  return `        <p><seg type="section" n="${c.localN}" xml:id="section-praefatio-${c.localN}" corresp="https://nepos.humanisticadigitalia.eu/life/praefatio#chapter-${c.localN}">${escape(text)}</seg></p>`;
});
const prefaceDocument = `<TEI xmlns="${ns}" xml:id="text-praefatio">
  <teiHeader xml:lang="en">
    <fileDesc>
      <titleStmt><title>Praefatio</title><author>Cornelius Nepos</author><respStmt><resp>Curated and maintained by</resp><name>Dr. Maria Papadopoulou, Digital Humanities and Classics, University of Crete</name></respStmt></titleStmt>
      <publicationStmt><publisher>Humanistica Digitalia</publisher><date when="${revisionDate}">${revisionDate}</date></publicationStmt>
      <sourceDesc><bibl corresp="#source-praefatio"><title>Praefatio in the Nepos Digital Scholarly Edition</title><ref target="https://nepos.humanisticadigitalia.eu/life/praefatio">Edition reader</ref><note>Text taken from the eight records with life=praefatio in server/data/chapters.json. This member is derived from the edition's reader data, not from the 25 pinned Perseus XML files. An underlying printed edition has not been established from that dataset.</note></bibl></sourceDesc>
    </fileDesc>
    <encodingDesc><editorialDecl><p>The eight numbered reader units are encoded as sections of a preface, retaining their exact text, spelling and punctuation. The reader's named-entity wrappers are not imported as TEI name annotations. No additional assertions have been inferred.</p></editorialDecl></encodingDesc>
    <profileDesc><langUsage><language ident="la">Latin</language></langUsage></profileDesc>
    <revisionDesc><change when="${revisionDate}">Added the complete Praefatio from the edition's reader, with separate provenance and stable section identifiers.</change></revisionDesc>
  </teiHeader>
  <text xml:lang="la"><body><div type="preface" xml:id="preface-praefatio">
${prefaceParagraphs.join('\n')}
  </div></body></text>
</TEI>`;
documents.unshift(prefaceDocument);
sectionCount += prefaceUnits.length;

const annotationIds = new Set();
const annotations = assertions.map(a => {
  if (annotationIds.has(a.id)) throw Error(`Duplicate assertion: ${a.id}`);
  annotationIds.add(a.id);
  if (!personMap.has(a.subject) || (a.object && !personMap.has(a.object)) || (a.place && !placeMap.has(a.place))) throw Error(`Unresolved entity: ${a.id}`);
  const targets = a.passages.map(p => {
    const id = chapterId(p.life, p.chapter);
    if (!allChapters.has(id)) throw Error(`Missing passage ${id} for ${a.id}`);
    return `#${id}`;
  });
  const references = [
    `<ref type="subject" target="#person-${attr(a.subject)}">${escape(personMap.get(a.subject).name)}</ref>`,
    a.object ? `<ref type="object" target="#person-${attr(a.object)}">${escape(personMap.get(a.object).name)}</ref>` : '',
    a.place ? `<ref type="place" target="#place-${attr(a.place)}">${escape(placeMap.get(a.place).label)}</ref>` : '',
    ...a.passages.map(p => `<ref type="reader" target="https://nepos.humanisticadigitalia.eu/life/${attr(p.life)}#chapter-${p.chapter}">${escape(lifeMap.get(p.life).title)} ${p.chapter}</ref>`)
  ].filter(Boolean);
  return `    <annotation xml:id="${attr(a.id)}" target="${targets.join(' ')}" motivation="describing" ana="#topic-${attr(a.topic)}" cert="${attr(a.confidence)}" source="#source-assertions">
      <note type="summary">${escape(a.note)}</note>
      <note type="structured-data">${featureStructure(a, 'nepos-assertion')}</note>
      ${references.join('\n      ')}
    </annotation>`;
});

const personEntries = people.map(p => `    <person xml:id="person-${attr(p.id)}"><persName>${escape(p.name)}</persName>${p.latin ? `<persName xml:lang="la" type="Latin">${escape(p.latin)}</persName>` : ''}${externalIds(p)}<note>${featureStructure(p, 'nepos-person')}</note></person>`);
const placeEntries = places.map(p => `    <place xml:id="place-${attr(p.id)}"><placeName>${escape(p.label)}</placeName>${p.latin ? `<placeName xml:lang="la" type="Latin">${escape(p.latin)}</placeName>` : ''}${typeof p.lat === 'number' && typeof p.lng === 'number' ? `<location><geo>${p.lat} ${p.lng}</geo></location>` : ''}${externalIds(p)}<note>${featureStructure(p, 'nepos-place')}</note></place>`);

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-model href="https://tei-c.org/Vault/P5/4.12.0/xml/tei/custom/schema/relaxng/tei_all.rng" schematypens="http://relaxng.org/ns/structure/1.0"?>
<teiCorpus xmlns="${ns}" xml:id="nepos-assertion-corpus" version="4.12.0">
  <teiHeader xml:lang="en">
    <fileDesc>
      <titleStmt>
        <title>Cornelius Nepos: Perseus TEI, Praefatio and the Nepos edition's assertions</title>
        <author>Cornelius Nepos</author>
        <respStmt xml:id="maria-papadopoulou"><resp>Curated and maintained by</resp><name>Dr. Maria Papadopoulou, Digital Humanities and Classics, University of Crete</name></respStmt>
      </titleStmt>
      <editionStmt><edition>Enriched TEI corpus, ${revisionDate}</edition></editionStmt>
      <publicationStmt>
        <publisher>Humanistica Digitalia</publisher>
        <date when="${revisionDate}">${revisionDate}</date>
        <availability><p>The Perseus text component is distributed under <ref target="https://creativecommons.org/licenses/by-sa/4.0/">Creative Commons Attribution-ShareAlike 4.0 International</ref>, as stated in the source repository. Original headers and repository notices are retained. No new licence is assigned here to the edition's assertion data.</p></availability>
      </publicationStmt>
      <sourceDesc>
        <listBibl>
          <bibl xml:id="source-perseus"><title>PerseusDL/canonical-latinLit</title><ref target="https://github.com/PerseusDL/canonical-latinLit/tree/${commit}/data/phi0588">Cornelius Nepos, 25 perseus-lat2 XML files</ref><idno type="git-commit">${commit}</idno></bibl>
          <bibl xml:id="source-assertions"><title>Nepos Digital Scholarly Edition: assertions</title><ref target="https://nepos.humanisticadigitalia.eu/assertions">Website assertions</ref><note>All ${assertions.length} records from server/data/assertions.json in the corrected edition package; original identifiers, values, notes, dates and passage references are retained.</note></bibl>
          <bibl xml:id="source-entities"><title>Nepos edition entity registers</title><note>server/data/persons.json and server/data/places.json from the same edition package.</note></bibl>
          <bibl xml:id="source-praefatio"><title>Praefatio in the Nepos Digital Scholarly Edition</title><ref target="https://nepos.humanisticadigitalia.eu/life/praefatio">Edition reader</ref><note>The eight records with life=praefatio in server/data/chapters.json; this text has a separate provenance from the 25 Perseus XML documents.</note></bibl>
        </listBibl>
      </sourceDesc>
    </fileDesc>
    <encodingDesc>
      <projectDesc><p>The corpus combines 25 Perseus TEI documents and the Praefatio from the edition's reader with ${assertions.length} independent, stand-off annotations. Each annotation targets the chapter or chapters cited by the website dataset. No assertion targets another assertion. No more precise section-level evidential attribution has been inferred.</p></projectDesc>
      <editorialDecl><p>The original Latin text, punctuation, whitespace and editorial elements of the Perseus documents are retained. Work, chapter and section identifiers have been added; repeated CTS identifiers have been made unique and citation declarations adapted to this corpus. The third Cato chapter, unnumbered in the source, is numbered 3. The Praefatio is included as a separately attributed document, preserving the exact text of the eight numbered units in the edition's reader data.</p><p>Assertions remain editorial records from the website dataset; their confidence values are copied, not independently reassessed. TEI feature structures preserve all original JSON fields and types. Negative year integers retain the source dataset's BC convention and are not converted to XML Schema dates. Person and place registers reproduce the website data; their inclusion does not add name tagging to the Latin text. This export does not import additional classifications from the separate OWL file.</p></editorialDecl>
      <classDecl><taxonomy xml:id="assertion-topics">${topics.map(topic => `<category xml:id="topic-${attr(topic)}"><catDesc>${escape(topic)}</catDesc></category>`).join('')}</taxonomy></classDecl>
    </encodingDesc>
    <profileDesc><langUsage><language ident="la">Latin source texts</language><language ident="en">English annotations and metadata</language></langUsage></profileDesc>
    <revisionDesc><change when="${revisionDate}">Added the complete Praefatio from the edition's reader with separate provenance.</change><change when="${revisionDate}">Combined the pinned Perseus texts with the edition's flat assertion dataset and entity registers. Added persistent fragment identifiers and retained source attribution.</change></revisionDesc>
  </teiHeader>
  <standOff xml:id="nepos-annotations" xml:lang="en">
    <listAnnotation xml:id="assertions">
${annotations.join('\n')}
    </listAnnotation>
    <listPerson xml:id="persons" source="#source-entities">
${personEntries.join('\n')}
    </listPerson>
    <listPlace xml:id="places" source="#source-entities">
${placeEntries.join('\n')}
    </listPlace>
  </standOff>
${documents.join('\n')}
</teiCorpus>
`;

const output = path.join(root, 'web/tei/nepos-assertions-tei.xml');
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, xml);
const manifest = { generated: revisionDate, sourceCommit: commit, corpus: 'web/tei/nepos-assertions-tei.xml', corpusSha256: sha256(xml), works: documents.length, perseusWorks: lifeIds.length, praefatio: { source: 'server/data/chapters.json', filter: { life: 'praefatio' }, sections: prefaceUnits.length }, chapters: allChapters.size, sections: sectionCount, assertions: assertions.length, passageLinks: assertions.reduce((n, a) => n + a.passages.length, 0), sourceFiles: sourceManifest, dataFiles: ['assertions', 'persons', 'places', 'lives', 'chapters'].map(name => ({ path: `server/data/${name}.json`, sha256: sha256(fs.readFileSync(path.join(root, 'server/data', `${name}.json`))) })) };
fs.writeFileSync(path.join(root, 'data/perseus/provenance.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Built ${output}: ${documents.length} works, ${allChapters.size} chapters, ${sectionCount} sections, ${assertions.length} assertions.`);
