// ====================================================================
// NSBS ELECTION 2026 - DEMO DATA & REPOSITORY LAYER
// Mock student records, candidate database, and election audit engine.
// Easily interchangeable with the production NSBS student database.
// ====================================================================

import { isElectoralBodyExempt, EXEMPTION_MESSAGE, normalizeMatric } from './electionSecurity';

export interface DemoStudent {
  matric_number: string;
  name: string;
  level: string;
  department: string;
  is_exempt?: boolean;
}

export interface DemoCandidate {
  id: string;
  name: string;
  position: string;
  level: string;
  photo_url: string;
  manifesto: string;
}

export interface DemoElectionPosition {
  id: string;
  title: string;
  required: boolean;
  candidates: DemoCandidate[];
}

export interface DemoVoteRecord {
  matric_number: string;
  reference_code: string;
  timestamp: string;
}

export interface DemoBallotVaultItem {
  id: string;
  position: string;
  candidate_id: string;
  candidate_name: string;
  timestamp: string;
}

export interface DemoElectionStats {
  registered_voters: number;
  eligible_voters: number;
  votes_cast: number;
  accredited_voters: number;
  yet_to_vote: number;
  remaining_voters: number;
  turnout_percentage: number;
  status: 'open' | 'closed' | 'upcoming';
  election_title: string;
  candidate_tallies: Record<string, number>; // candidate_id -> count
}

// 1. MOCK STUDENT DIRECTORY (Parsed & Deduplicated Biochemistry Roster - 264 Verified Records)
export const MOCK_STUDENTS: DemoStudent[] = [
  {
    "matric_number": "2023/0296",
    "name": "ABAYOMI ANUOLUWA OPEYEMI",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/1331",
    "name": "ABIODUN AYOBAMI GLORY",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/1011",
    "name": "ADEFIOYE ISAAC OLUWASEUN",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/1084",
    "name": "ADEFIOYE OLAMIDE ABOSEDE",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/1218",
    "name": "ADENIRAN CHRISTIANAH OLUWATOSIN",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/1367",
    "name": "ADIGUN FATHIA ANUOLUWAPO",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/1931",
    "name": "ADEDAYO IYANUOLUWA FAITH",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/0189",
    "name": "ADEBAYO IDAYAT AYOMIDE",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/1437",
    "name": "ADEOYE DANIEL ADEWALE",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/1096",
    "name": "ADEPOJU JOY OLUWASEUN",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/1230",
    "name": "ADEWALE INIOLUWA DEBORAH",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/0497",
    "name": "ADEKOYA ANJOLAOLUWA MUTIAT",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/1002",
    "name": "ADEOSUN PRAISE ADEYOYIN",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/1031",
    "name": "ADERIBIGBE VICTOR ADEDAYO",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/0077",
    "name": "ADERIBIGBE MARY HERITAGE",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/0613",
    "name": "AFEEZ ROFIYAT IYANUOLUWA",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/0279",
    "name": "AFOLABI ABDUL RAHMAN",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/0391",
    "name": "AFOLABI IFEOLUWA ABIGAIL",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/0992",
    "name": "AJEWOLE TOLULOPE DORCAS",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/0416",
    "name": "AJAYI BOLUWATIFE OLUWAGBEMILEKE",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/1229",
    "name": "AJAYI RHODA OLABISI",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2024/0255",
    "name": "AJAYI IDAYAT OMOWUNMI",
    "level": "200 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/0709",
    "name": "AKINREFON ADEDOYIN RUTH",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/0676",
    "name": "AKINOLA DEBORAH OLUWASEYI",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/0304",
    "name": "AKINWUNMI DAMILOLA ZAINAB",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/0353",
    "name": "AKINYOMI SUCCESS AYOMIDE",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/0030",
    "name": "ANTHONY PREVAILER GOODNESS",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/0988",
    "name": "ARATUNDE OKIKI GLORIA",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/1302",
    "name": "ASANBE GRACE ENIOLA",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/1001",
    "name": "ATOBALO ZAINAB TEMILAYO",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/1251",
    "name": "AYANTOYE CHRISTIANAH AYOMIDE",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/0849",
    "name": "AYEGBUSI ABIDEMI JANET",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/1067",
    "name": "AZEEZ SEMIYAT OMOTOLANI",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/0044",
    "name": "BABALOLA PHEOBE FAITH",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/0097",
    "name": "BELLO ADURAGBEMI JANET",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/0914",
    "name": "ELUGBADEBO TESTIMONY OLAMIDE",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/1475",
    "name": "FARAMADE MOSUNMADE MARY",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/0410",
    "name": "FAITH AYENI OLUWADUNSIN",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/0357",
    "name": "GBIRI EMMANUEL TEMIDAYO",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/0033",
    "name": "HASSAN ROFIAT OLUWABUNMI",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/1363",
    "name": "LAWAL STELLA FOLASHADE",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/1056",
    "name": "MUHAMMAD ABDULRAMON SEGUN",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/0542",
    "name": "MUNIRUDEEN RODIAT AYONI",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/0293",
    "name": "NKPOKITI JORDAN CHIBUIKE",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/1631",
    "name": "OGUCHE JOSHUA THANKGOD",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/1019",
    "name": "OGUNDIPE MAYOWA DAVID",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/1499",
    "name": "OJO FUNMILAYO MARY",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/0742",
    "name": "OKEOLA SUNMISOLA OMOLADE",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/0407",
    "name": "OKERINDE ELIZABETH IDOWU",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/0374",
    "name": "OLADELE SEWA OLUWABUKOLA",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/1242",
    "name": "OLADOSU GRACIOUS OLUWATEMILORUN",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/0201",
    "name": "OLALEKAN ESTHER IYANUOLUWA",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/1075",
    "name": "OLALEKAN PETER AKOLADE",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/0386",
    "name": "OLASUPO KODIJAT OLUWADAMILOLA",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/0943",
    "name": "OLOIDI PHEOBE IFEOLUWA",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/0445",
    "name": "OLOWOYO ABDULLAHI AYOMIDE",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/0418",
    "name": "OMODELE FAITH OLUWANIFEMI",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/1141",
    "name": "ONORIODE SAMUEL AYOMIDE",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/0697",
    "name": "OSENI SALAWAT FOLASHADE",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/0981",
    "name": "OWOPETU TOBOLOBA OLAYEMI",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/0288",
    "name": "ODEWUNMI COMFORT AYOMIDE",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/0768",
    "name": "ODUBOLA OYINDAMOLA",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/0530",
    "name": "OGUNKOYA AISHAT AYOMIDE",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/1854",
    "name": "OLUWAGBAYE GBOLAHAN SOLOMON",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/0940",
    "name": "OYERINDE PRECIOUS DAMILOLA",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/0158",
    "name": "SALAUDEEN MARYAM DAMILOLA",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/0867",
    "name": "SHAIBU VICTORIA ADA",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/1648",
    "name": "SUNDAY DORCAS OLUWAFUNMILAYO",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/0054",
    "name": "SULAIMON FIKAYO",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/1715",
    "name": "FALOLA TUNMISE EMMANUEL",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2023/0854",
    "name": "ADESOJI BRIGHT ADESAKIN",
    "level": "300 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2024/0012",
    "name": "Abiona Ezekiel Oluwajuwon",
    "level": "200 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2024/0397",
    "name": "Osanebi Mercy Ejiro",
    "level": "200 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2024/0409",
    "name": "Warieta Patience Aghogho",
    "level": "200 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2024/0548",
    "name": "Olayinka Israel Oluwadamilola",
    "level": "200 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2024/0569",
    "name": "Abolaji Stella Oluwapelumi",
    "level": "200 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2024/0615",
    "name": "Adebayo Oluwatunmise Dorcas",
    "level": "200 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2024/0631",
    "name": "Oluyemi Joy Elizabeth",
    "level": "200 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2024/0674",
    "name": "Oladiran Olamidun Dorcas",
    "level": "200 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2024/0694",
    "name": "Ayinde Esther Odunayo",
    "level": "200 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2024/0708",
    "name": "Adebowale David Timileyin",
    "level": "200 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2024/0758",
    "name": "Lawal Jamiu Abiola",
    "level": "200 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2024/0797",
    "name": "Adetona Jubril Olatunbosun",
    "level": "200 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2024/0835",
    "name": "Adewumi Sunmisola Peace",
    "level": "200 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2024/1105",
    "name": "Oludiran Tolulope Elizabeth",
    "level": "200 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2024/1148",
    "name": "Afolabi Kehinde David",
    "level": "200 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2024/1193",
    "name": "Olaiya Fathia Oyindamola",
    "level": "200 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2024/1206",
    "name": "Komolafe Ayomide Florence",
    "level": "200 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2024/1252",
    "name": "Adeniyi Feranmi Joseph",
    "level": "200 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2024/1296",
    "name": "Anjorin Elizabeth",
    "level": "200 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2024/1302",
    "name": "Lukman Eniola Alimot",
    "level": "200 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2024/1376",
    "name": "Afolayan Odunola Deborah",
    "level": "200 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2024/1387",
    "name": "Bada Olamide Elizabeth",
    "level": "200 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2024/1534",
    "name": "Idris Blessing Ojone",
    "level": "200 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2024/1589",
    "name": "Fajemiyo Rachael Tomiwa",
    "level": "200 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2024/1597",
    "name": "Otitoloju Michael Choice",
    "level": "200 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2024/1601",
    "name": "Aluko Yetunde Oluwatosin",
    "level": "200 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2024/1629",
    "name": "Oyesoji Victor Olamide",
    "level": "200 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2024/1747",
    "name": "Adegbite Tolulope Elijah",
    "level": "200 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2024/1929",
    "name": "Ibiyemi Testimony Odidiore",
    "level": "200 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2024/1946",
    "name": "Ajayi Precious Deborah",
    "level": "200 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2024/1964",
    "name": "Afolabi Opeyemi Ranti",
    "level": "200 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2024/1988",
    "name": "Hannafi Aliyah Asani",
    "level": "200 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2024/2015",
    "name": "Oladosu Hannat Omolara",
    "level": "200 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2024/2070",
    "name": "Orekoya Esther Moyosoreoluwa",
    "level": "200 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2024/2149",
    "name": "Alawode Israel Oluwasemilore",
    "level": "200 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2024/2470",
    "name": "Oguntayo Victor Bisola",
    "level": "200 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2024/2619",
    "name": "Igbokwe Chioma Michele",
    "level": "200 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2024/2624",
    "name": "Oluyemi Olayinka Caroline",
    "level": "200 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2024/2628",
    "name": "Adeagbo Fodilullahi Ayobami",
    "level": "200 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2024/2635",
    "name": "Olaoye Rachael Darasimi",
    "level": "200 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2024/2723",
    "name": "Babalola Jamalideen Ayinde",
    "level": "200 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2024/2763",
    "name": "Ikpasa Shalom Ejiro",
    "level": "200 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2024/2771",
    "name": "Adebayo Aminat Ayomide",
    "level": "200 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2024/2786",
    "name": "Ayodeji Damilola Omofunke",
    "level": "200 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2024/2956",
    "name": "Ademilola Adebayo Precious",
    "level": "200 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2024/2989",
    "name": "Fashina Iseoluwa Esther",
    "level": "200 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2024/3031",
    "name": "Akande Bukola Eniola",
    "level": "200 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2024/3081",
    "name": "Festus Favour Funmilayo",
    "level": "200 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2024/3106",
    "name": "Olusola Fisayo Oyinkansola",
    "level": "200 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2024/3129",
    "name": "Asaola Opeyemi Ifeoluwapo",
    "level": "200 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2024/3146",
    "name": "Badmus Rodiah Oluwapelumi",
    "level": "200 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2024/3182",
    "name": "Adepoju Tawalit Opeyemi",
    "level": "200 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2024/3188",
    "name": "Lawal Christianah Boluwatife",
    "level": "200 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2024/3349",
    "name": "Adeleke Grace Monjolajesu",
    "level": "200 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2024/3354",
    "name": "Akinlosotu Marvellous Sunday",
    "level": "200 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2024/3394",
    "name": "Salami Eniola Barakat",
    "level": "200 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2024/3496",
    "name": "Mogaji Zainab Okikiola",
    "level": "200 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/9403",
    "name": "Abayomi Surprise Gideon",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/3960",
    "name": "ABDULGANIYU ABIBAT OLUWATOYIN",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/8368",
    "name": "ABDULAKEEM MARIAM OMOWUNI",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/7002",
    "name": "ABDULLAHI ISLAMIYAT BUKOLA",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/8284",
    "name": "ABIODUN KEBIRAT OLUWATOMIWA",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/5186",
    "name": "ADEBAYO MERCY OPEMIPOSI",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/5690",
    "name": "ADEBIYI JOSHUA ADEYINKA",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/3914",
    "name": "ADEYEMO AISHAT",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/6476",
    "name": "ADEWUSI OLUWADEMILADE PHEBE",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/5998",
    "name": "ADEBAYO OMOTAYO ROSELINE",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/5348",
    "name": "ADENIYI IDRIS OPEYEMI",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/5218",
    "name": "ADENIYI AYOMIDE ANDREW",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/5974",
    "name": "ADERIBIGBE ELIZABETH ADEJOKE",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/8193",
    "name": "ADEBISI RIDWAN BOLUWATIFE",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/4936",
    "name": "ADEBIYI ESTHER ODUNAYO",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/7484",
    "name": "ADEKANOLU MISTURAH AJOKE",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/7613",
    "name": "ABDULGANIYU NAFIHU OLAMILEKAN",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/9651",
    "name": "ADEDEJI ADEJOKE ESTHER",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/8655",
    "name": "ADEWUSI PHILIP ADEYEMI",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/10364",
    "name": "ADEBAYO INIOLUWA GLORIA",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/10949",
    "name": "ADEGBOYEGA TAIWO OLAMILEKAN",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/3943",
    "name": "AGBAJILEKE JOSEPH GOODLUCK",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/8700",
    "name": "ADEYEMI ZAINAB OYINKANSOLA",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/10308",
    "name": "AGBOOLA AISHAT OMOWONUOLA",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/3818",
    "name": "AJAKAYE EMMANUEL DAMILOLA",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/9319",
    "name": "AJETUNMOBI ADURAGBEMI IFEOLUWA",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/5263",
    "name": "ABDULHAMEED BUSHROH OPEYEMI",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/5103",
    "name": "AKINWEKOMI OPEYEMI GOLD",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/6023",
    "name": "AKINLUYI MARVELLOUS BABALOLA",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/7745",
    "name": "AKINMOYE ISEOLUWA",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/7474",
    "name": "AJISAFE EMMANUEL AYOMIDE",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/7254",
    "name": "AKINEGBE HASSABAT ODUNAYO",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/8241",
    "name": "AKINROLA PRECIOUS FOLAYEMI",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/9663",
    "name": "AKINBOLA PETER AANUOLUWA",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/8103",
    "name": "AKINTADE OMOWUMI RACHEAL",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/9950",
    "name": "AKINSEMOGUN AYOMIDE ABDULWAAHAB",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/7784",
    "name": "AKOREDE KARIMOT OLAJUMOKE",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/6462",
    "name": "AMIOLEMEN DEBORAH USERIEDO",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/9701",
    "name": "ANIEFIOK FAITH EDIMA",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/6330",
    "name": "ANIBASA MARVELLOUS OYIZA",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/6141",
    "name": "AREMU OLANREWAJU RIDWAN",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/9513",
    "name": "AREMU JUMOKE BUNKUNMI",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/9723",
    "name": "ANIMASHAUN ADEYINKA ABDULMUTTEW",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/8699",
    "name": "ASHIWAJU OLUWAFERANMI DEBORAH",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/9426",
    "name": "ANIFOWOSHE ZAINAB ENIOLA",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/7235",
    "name": "AYANTOLA SULIYAT ABIDEMI",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/9032",
    "name": "BABATUNDE SAMUEL AYOMIDE",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/4903",
    "name": "BAKARE SAMOD OLAWALE",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/5585",
    "name": "BABATOLA AYOBAMIDELE RACHEAL",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/8407",
    "name": "BOLODEOKU ELIZABETH OLUWATOSIN",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/10221",
    "name": "BABATUNDE BLESSING ELIZABETH",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/9619",
    "name": "DAUDA ALIYAT OYINKANSOLA",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/11061",
    "name": "DOUGLAS SAMUEL EMMANUEL",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/9326",
    "name": "EZEIKE TOCHI LOVETH",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/9347",
    "name": "EZEKIEL ANUOLUWAPO ARIKE",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/5314",
    "name": "FALADE OLUWANIFEMI MARY",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/9040",
    "name": "FASHOLA MISTURA ENIOLA",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/8580",
    "name": "FAMUDEHIN PRAISE TEMILOLUWA",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/7098",
    "name": "FAMUREWA TEMILOLUWA ADEBOLA",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/8597",
    "name": "FAROYE IREOLUWA EBUNOLUWA",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/7012",
    "name": "FRANCIS CHRISTIANAH OCHUOLE",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/8978",
    "name": "IDOWU JOSEPH OLAMIDE",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/11321",
    "name": "IBRAHIM MARYAM OMOWUNMI",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/7995",
    "name": "ISIAQ MARIAM AJOKE",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/8825",
    "name": "ISMAIL ISLAMIYYAH TEMITOPE",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/6928",
    "name": "JAMES FAVOUR OLUWATOFUNMI",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/9036",
    "name": "JEJELOWO MODUPEOLUWA REBECCA",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/3727",
    "name": "JEODA OLUWADOLAPO ESTHER",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/10395",
    "name": "JEROME FAVOUR AYOMIDE",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/6613",
    "name": "JOHN PRECIOUS AYOMIDE",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/4045",
    "name": "JOHNSON ADESHOLA ODUNAYO",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/8816",
    "name": "KALU CHIDIEBUBE DAVID",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/5901",
    "name": "KARUFI ALIMAH ORIYOMI",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/7875",
    "name": "KOSHIMO AYOMIDE EMMANUEL",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/7797",
    "name": "LAWAL SUSAN ALIYAH",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/7886",
    "name": "LADITAN OLUWASEYI ISRAEL",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/9801",
    "name": "LAYADE JOY MERCY",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/4938",
    "name": "LUCKY FAVOUR OMOAHO",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/9249",
    "name": "MAKINDE TOYIN JANET",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/9063",
    "name": "MUDASIRU ASISAT OMOTAYO",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/11281",
    "name": "NWAEZE CHIOMA FAVOUR",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/6104",
    "name": "OGUNREMI ALEXANDER OLUWATUMININU",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/6848",
    "name": "ODENIYI NELSON EYITAYO",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/6960",
    "name": "OGUNRONBI DAVID OLUWATOMISIN",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/7636",
    "name": "OGUNNIYI OLAMIDE MARY",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/3633",
    "name": "OGUNGBAYI ADERINSOLA OREOLUWA",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/5350",
    "name": "OGUNJIMI FAVOUR ABIGAEL",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/5617",
    "name": "OJO ELIZABETH OLAMIDE",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2024/9778",
    "name": "OJEDIRAN SAMUEL YINKA",
    "level": "200 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/6002",
    "name": "OKONJI CHARITY CHUKWUNFUNAYA",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/8499",
    "name": "MUSA MEDINAT ONONIVAMI",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/9960",
    "name": "OLAYEMI HAPPINESS ABIGAIL",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/7469",
    "name": "OLADELE BARAKAT OMOLABAKE",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/10298",
    "name": "OLAGOKE ELIZABETH OLAMIDE",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/6539",
    "name": "OLANIYAN CHRISTIANAH ENIOLA",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/8360",
    "name": "OLAJIDE VINCENT JOSHUA",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/8524",
    "name": "OLADEPO TITILOPE BLESSING",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/8383",
    "name": "OLATUJOYE FAITH OLAYINKA",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/6798",
    "name": "OLADEJO ALIMOT ENIOLA",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/4826",
    "name": "OLANIYI DEBORAH OPEYEMI",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/6255",
    "name": "OLANIYAN NAFISAT AJOKE",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/5078",
    "name": "OLAOYE ESTHER OLUWASEUN",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/6097",
    "name": "OLAFIOYE PRECIOUS IYANUOLUWA",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/8778",
    "name": "OLUFASE EMMANUELLA TIJESU",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/10131",
    "name": "OLUMIYE BOLUWATIFE ELIZABETH",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/7936",
    "name": "OLUWANIYI HANNAH OLUWASEUN",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/11115",
    "name": "OFUONYEBI EMMANUEL ABIODUN",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/4003",
    "name": "OMOTOSHO AYOMIDE SAMUEL",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/5800",
    "name": "ORIBALOYE JOY AANUOLUWA",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/9189",
    "name": "OMOLE MOSES OLAMILEKAN",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/8012",
    "name": "ORIOWO CAROLINE PAMILERIN",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/9915",
    "name": "ORABIYI TITILAYO OLAWUNMI",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/6000",
    "name": "OROBIYI TAIWO ROKIBAT",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/5962",
    "name": "OWOLABI ALIYAH OLATOMIWA",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/10059",
    "name": "PAUL BLESSING ADEOLA",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/9225",
    "name": "QUAINOO ESTHER NANA",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/3695",
    "name": "RAJI ROHEEMAT IKEOLUWA",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/6092",
    "name": "RABIU HUZAINOT OLUWAPELUMI",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/10605",
    "name": "RAUF ISLAMIAT ITUNU",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/9905",
    "name": "RASHEED-SANUSI OLUWAFERANMI OLABISI",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/8154",
    "name": "SALAKO OLUWASEUN OLAMIDE",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/4774",
    "name": "SAMSON ENIOLA SARAH",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/5057",
    "name": "SAMUEL OLAMILEKAN MOSES",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/8047",
    "name": "SOLOMON GLORY OLUWAFIKAYOMI",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/7874",
    "name": "SULAIMAN MUIIZZ AYOMIDE",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/9776",
    "name": "SULAIMAN RIDWAN AJIBOLA",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/3777",
    "name": "SUNDAY BIDEMI OMOWUNMI",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/7057",
    "name": "THOMPSON OMOTOLANI MOTILAYO",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/7383",
    "name": "YINUSA AISHAT AYOMIPOSI",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/7290",
    "name": "ZAKARIYAU MUMINAT TEMITOPE",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/4370",
    "name": "JOSEPH PAUL AYODEJI",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/6162",
    "name": "OLADAPO OLUWANIFEMI SARAH",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/9578",
    "name": "ALAWODE OMOLABAKE AMINAT",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/11244",
    "name": "YUSUF HALIYAT ANIKE",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/9810",
    "name": "AKINTEWE SANDRA OREOLUWA",
    "level": "100 Level",
    "department": "Biochemistry"
  },
  {
    "matric_number": "2025/3967",
    "name": "ADEREMI OLALEKAN AYANFE",
    "level": "100 Level",
    "department": "Biochemistry"
  }
];

export const TOTAL_DEPARTMENT_REGISTERED_STUDENTS = MOCK_STUDENTS.length;

// 2. MOCK CANDIDATE DIRECTORY (Grouped by Position)
export const MOCK_POSITIONS: DemoElectionPosition[] = [
  {
    id: 'president',
    title: 'President',
    required: true,
    candidates: [
      {
        id: 'cand-pres-1',
        name: 'Babalola Ayodeji',
        position: 'President',
        level: '400 Level',
        photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
        manifesto: 'Promoting student welfare, pioneering biochemistry research symposia, and building stronger industry partnerships.'
      },
      {
        id: 'cand-pres-2',
        name: 'Oladipo Grace Morayo',
        position: 'President',
        level: '300 Level',
        photo_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400',
        manifesto: 'Transparent leadership, academic empowerment, comprehensive tutorial networks, and digital departmental services.'
      }
    ]
  },
  {
    id: 'vice-president',
    title: 'Vice President',
    required: true,
    candidates: [
      {
        id: 'cand-vp-1',
        name: 'Adeyemi Toluwalase',
        position: 'Vice President',
        level: '300 Level',
        photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400',
        manifesto: 'Bridging faculty-student communication, fostering academic mentorship, and coordinating impactful workshop series.'
      },
      {
        id: 'cand-vp-2',
        name: 'Ekechukwu Victor',
        position: 'Vice President',
        level: '300 Level',
        photo_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400',
        manifesto: 'Student inclusivity, enhanced laboratory welfare, and dedicated support for freshman transition programs.'
      }
    ]
  },
  {
    id: 'gen-sec',
    title: 'General Secretary',
    required: true,
    candidates: [
      {
        id: 'cand-gs-1',
        name: 'Fashola Olamide',
        position: 'General Secretary',
        level: '300 Level',
        photo_url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=400',
        manifesto: 'Accurate departmental documentation, timely meeting minutes publication, and digitized secretarial records.'
      },
      {
        id: 'cand-gs-2',
        name: 'Yusuf Maryam',
        position: 'General Secretary',
        level: '200 Level',
        photo_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400',
        manifesto: 'Proactive communications, seamless bulletin dissemination, and accessible executive contact channels.'
      }
    ]
  },
  {
    id: 'asst-gen-sec',
    title: 'Assistant General Secretary',
    required: true,
    candidates: [
      {
        id: 'cand-ags-1',
        name: 'Ajayi Peter Timilehin',
        position: 'Assistant General Secretary',
        level: '200 Level',
        photo_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=400',
        manifesto: 'Diligent assistance to the secretariat, effective record organization, and student inquiry follow-up.'
      },
      {
        id: 'cand-ags-2',
        name: 'Bakare Eniola',
        position: 'Assistant General Secretary',
        level: '200 Level',
        photo_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=400',
        manifesto: 'Speedy notice dispatches, reliable secretariat archiving, and active engagement with student representatives.'
      }
    ]
  },
  {
    id: 'treasurer',
    title: 'Treasurer',
    required: true,
    candidates: [
      {
        id: 'cand-trs-1',
        name: 'Ogunsola Samuel',
        position: 'Treasurer',
        level: '300 Level',
        photo_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=400',
        manifesto: 'Uncompromising financial integrity, immediate digital receipt issuance, and open quarterly financial updates.'
      },
      {
        id: 'cand-trs-2',
        name: 'Nwosu Chidinma',
        position: 'Treasurer',
        level: '300 Level',
        photo_url: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=400',
        manifesto: 'Fiscal prudence, transparent dues allocation, and efficient resource management for student welfare.'
      }
    ]
  },
  {
    id: 'fin-sec',
    title: 'Financial Secretary',
    required: true,
    candidates: [
      {
        id: 'cand-fs-1',
        name: 'Salami Kehinde',
        position: 'Financial Secretary',
        level: '200 Level',
        photo_url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=400',
        manifesto: 'Precise financial book-keeping, real-time dues reconciliation, and automated payment receipts.'
      },
      {
        id: 'cand-fs-2',
        name: 'Lawal Qudus',
        position: 'Financial Secretary',
        level: '200 Level',
        photo_url: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&q=80&w=400',
        manifesto: 'Zero-delay dues tracking, transparent ledger accountability, and regular financial reporting.'
      }
    ]
  },
  {
    id: 'pro',
    title: 'Public Relations Officer',
    required: true,
    candidates: [
      {
        id: 'cand-pro-1',
        name: 'Adeleke David',
        position: 'Public Relations Officer',
        level: '200 Level',
        photo_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=400',
        manifesto: 'Expanding NSBS UNILESA brand reach, innovative media campaigns, and engaging departmental highlights.'
      },
      {
        id: 'cand-pro-2',
        name: 'Nwachukwu Faith',
        position: 'Public Relations Officer',
        level: '200 Level',
        photo_url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=400',
        manifesto: 'Vibrant event promotion, active social media engagement, and fast-track student announcement broadcasts.'
      }
    ]
  }
];

// Initial pre-seeded votes for realistic baseline analytics
const INITIAL_DEMO_VOTERS: DemoVoteRecord[] = [
  { matric_number: '2023/0077', reference_code: 'NSBS-2026-9A10K', timestamp: new Date(Date.now() - 3600000 * 4).toISOString() },
  { matric_number: '2024/0012', reference_code: 'NSBS-2026-4B82X', timestamp: new Date(Date.now() - 3600000 * 3).toISOString() },
  { matric_number: '2025/3960', reference_code: 'NSBS-2026-7C33L', timestamp: new Date(Date.now() - 3600000 * 2).toISOString() }
];

const INITIAL_DEMO_BALLOTS: DemoBallotVaultItem[] = [
  { id: '1', position: 'President', candidate_id: 'cand-pres-1', candidate_name: 'Babalola Ayodeji', timestamp: new Date(Date.now() - 3600000 * 4).toISOString() },
  { id: '2', position: 'President', candidate_id: 'cand-pres-2', candidate_name: 'Oladipo Grace Morayo', timestamp: new Date(Date.now() - 3600000 * 3).toISOString() },
  { id: '3', position: 'President', candidate_id: 'cand-pres-1', candidate_name: 'Babalola Ayodeji', timestamp: new Date(Date.now() - 3600000 * 2).toISOString() },

  { id: '4', position: 'Vice President', candidate_id: 'cand-vp-1', candidate_name: 'Adeyemi Toluwalase', timestamp: new Date(Date.now() - 3600000 * 4).toISOString() },
  { id: '5', position: 'Vice President', candidate_id: 'cand-vp-1', candidate_name: 'Adeyemi Toluwalase', timestamp: new Date(Date.now() - 3600000 * 3).toISOString() },
  { id: '6', position: 'Vice President', candidate_id: 'cand-vp-2', candidate_name: 'Ekechukwu Victor', timestamp: new Date(Date.now() - 3600000 * 2).toISOString() }
];

// Local storage key constants
const STORAGE_VOTERS_KEY = 'nsbs_demo_voters_roster_2026';
const STORAGE_BALLOTS_KEY = 'nsbs_demo_ballots_vault_2026';

function getStoredVoters(): DemoVoteRecord[] {
  if (typeof window === 'undefined') return INITIAL_DEMO_VOTERS;
  try {
    const raw = localStorage.getItem(STORAGE_VOTERS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_VOTERS_KEY, JSON.stringify(INITIAL_DEMO_VOTERS));
      return INITIAL_DEMO_VOTERS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_DEMO_VOTERS;
  }
}

function getStoredBallots(): DemoBallotVaultItem[] {
  if (typeof window === 'undefined') return INITIAL_DEMO_BALLOTS;
  try {
    const raw = localStorage.getItem(STORAGE_BALLOTS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_BALLOTS_KEY, JSON.stringify(INITIAL_DEMO_BALLOTS));
      return INITIAL_DEMO_BALLOTS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_DEMO_BALLOTS;
  }
}

// Generate Reference Number
export function generateReferenceCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `NSBS-2026-${code}`;
}

// 3. SERVICE FUNCTIONS

/**
 * Verify if matric number exists in mock biochemistry roster
 * Strictly enforces Electoral Body Exemption restrictions on normalized matriculation numbers.
 */
export function verifyStudentMatric(rawMatric: string): {
  success: boolean;
  student?: DemoStudent;
  alreadyVoted: boolean;
  isExempt?: boolean;
  error?: string;
} {
  const normalized = normalizeMatric(rawMatric);
  
  if (!normalized) {
    return {
      success: false,
      alreadyVoted: false,
      error: 'Please enter your matriculation number.'
    };
  }

  // 1. Check if matriculation number is exempted (Electoral Body Member)
  if (isElectoralBodyExempt(rawMatric)) {
    return {
      success: false,
      alreadyVoted: false,
      isExempt: true,
      error: EXEMPTION_MESSAGE
    };
  }

  // 2. Look up student in roster
  const student = MOCK_STUDENTS.find(s => normalizeMatric(s.matric_number) === normalized);
  
  if (!student) {
    return {
      success: false,
      alreadyVoted: false,
      error: 'Matric number could not be verified. Please check the number and try again.'
    };
  }

  // 3. Check if student has already voted
  const voters = getStoredVoters();
  const alreadyVoted = voters.some(v => normalizeMatric(v.matric_number) === normalized);

  return {
    success: true,
    student,
    alreadyVoted
  };
}

/**
 * Check if a matric number has already voted
 */
export function hasStudentVoted(rawMatric: string): boolean {
  const normalized = normalizeMatric(rawMatric);
  const voters = getStoredVoters();
  return voters.some(v => normalizeMatric(v.matric_number) === normalized);
}

/**
 * Record a vote with strict privacy separation:
 * 1. Accreditation Roster records the matric number and reference number (prevents duplicate vote).
 * 2. Anonymous Ballot Vault records candidate votes without any student identifier.
 */
export async function submitDemoVote(
  matricNumber: string,
  selections: Record<string, string> // { positionTitle: candidateId }
): Promise<{ success: boolean; referenceCode?: string; error?: string }> {
  const normalizedMatric = normalizeMatric(matricNumber);

  // Backend Security Enforcer: Reject exempted voters immediately
  if (isElectoralBodyExempt(matricNumber)) {
    return {
      success: false,
      error: EXEMPTION_MESSAGE
    };
  }

  // Simulate brief network latency for realistic demo feel
  await new Promise(resolve => setTimeout(resolve, 600));

  const voters = getStoredVoters();
  if (voters.some(v => normalizeMatric(v.matric_number) === normalizedMatric)) {
    return {
      success: false,
      error: 'Your vote for this election has already been submitted.'
    };
  }

  const referenceCode = generateReferenceCode();
  const timestamp = new Date().toISOString();

  // 1. Record voter accreditation (Prevents second vote)
  const newVoter: DemoVoteRecord = {
    matric_number: normalizedMatric,
    reference_code: referenceCode,
    timestamp
  };
  const updatedVoters = [newVoter, ...voters];

  // 2. Record anonymous ballots in secret vault
  const currentBallots = getStoredBallots();
  const newBallotItems: DemoBallotVaultItem[] = [];

  for (const [posTitle, candId] of Object.entries(selections)) {
    let candName = 'Unknown Candidate';
    for (const pos of MOCK_POSITIONS) {
      const match = pos.candidates.find(c => c.id === candId);
      if (match) {
        candName = match.name;
        break;
      }
    }

    newBallotItems.push({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      position: posTitle,
      candidate_id: candId,
      candidate_name: candName,
      timestamp
    });
  }

  const updatedBallots = [...currentBallots, ...newBallotItems];

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_VOTERS_KEY, JSON.stringify(updatedVoters));
      localStorage.setItem(STORAGE_BALLOTS_KEY, JSON.stringify(updatedBallots));
      window.dispatchEvent(new Event('demoElectionVotesUpdated'));
    } catch (err) {
      console.error('Storage error:', err);
    }
  }

  return {
    success: true,
    referenceCode
  };
}

/**
 * Get comprehensive election statistics for Admin Dashboard & Portal
 */
export function getDemoElectionStats(): DemoElectionStats {
  const voters = getStoredVoters();
  const ballots = getStoredBallots();

  const votesCastCount = voters.length;
  const eligibleVoters = TOTAL_DEPARTMENT_REGISTERED_STUDENTS;
  const remainingVoters = Math.max(0, eligibleVoters - votesCastCount);
  const turnoutPercentage = eligibleVoters > 0 ? Number(((votesCastCount / eligibleVoters) * 100).toFixed(2)) : 0;

  // Compute candidate tallies
  const tallies: Record<string, number> = {};
  for (const ballot of ballots) {
    tallies[ballot.candidate_id] = (tallies[ballot.candidate_id] || 0) + 1;
  }

  return {
    registered_voters: TOTAL_DEPARTMENT_REGISTERED_STUDENTS,
    eligible_voters: eligibleVoters,
    votes_cast: votesCastCount,
    accredited_voters: votesCastCount,
    yet_to_vote: remainingVoters,
    remaining_voters: remainingVoters,
    turnout_percentage: turnoutPercentage,
    status: 'open',
    election_title: 'NSBS ELECTION 2026',
    candidate_tallies: tallies
  };
}

/**
 * Reset demo election state back to default baseline
 */
export function resetDemoElectionState(): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_VOTERS_KEY, JSON.stringify(INITIAL_DEMO_VOTERS));
      localStorage.setItem(STORAGE_BALLOTS_KEY, JSON.stringify(INITIAL_DEMO_BALLOTS));
      window.dispatchEvent(new Event('demoElectionVotesUpdated'));
    } catch (err) {
      console.error(err);
    }
  }
}
