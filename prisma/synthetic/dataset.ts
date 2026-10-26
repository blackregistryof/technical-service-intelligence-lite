// Deterministic synthetic demo dataset for TSI Lite V0.1.
//
// Pure data: no database access, no current clock, no randomness. Every call
// to buildSyntheticDataset() returns identical content, so the dataset can be
// validated without PostgreSQL. Persistence lives in prisma/seed.ts.
//
// All ATM identifiers, models, codes, descriptions and comments are fictional.
// Timestamps are UTC.

export const REFERENCE_DATE = "2026-10-25";
/** End of the reference day; no record is registered or visited after it. */
export const REFERENCE_END = new Date("2026-10-25T23:59:59.999Z");
export const SOURCE_SYSTEM = "TSI-SYNTH";

export const WORK_TYPES = ["FAULT_CALL", "MAINTENANCE"] as const;
export const WORK_ORDER_STATUSES = ["OPEN", "HOLD", "CLOSED"] as const;
export const CODE_TYPES = ["FAULT", "RESOLUTION"] as const;

export type WorkType = (typeof WORK_TYPES)[number];
export type WorkOrderStatus = (typeof WORK_ORDER_STATUSES)[number];
export type CodeType = (typeof CODE_TYPES)[number];

export type SyntheticAtm = {
  id: string;
  atmNumber: string;
  model: string;
};

export type SyntheticWorkOrder = {
  id: string;
  atmId: string;
  externalId: string;
  sourceSystem: string;
  workType: WorkType;
  status: WorkOrderStatus;
  registeredAt: Date;
  faultCode: string | null;
  originalDescription: string;
};

export type SyntheticTechnicianVisit = {
  id: string;
  workOrderId: string;
  visitedAt: Date;
  actions: string;
  originalComment: string | null;
  resolutionCode: string | null;
  outcome: string | null;
};

export type SyntheticCode = {
  id: string;
  codeType: CodeType;
  code: string;
  description: string;
};

export type SyntheticDataset = {
  referenceDate: string;
  atms: SyntheticAtm[];
  workOrders: SyntheticWorkOrder[];
  technicianVisits: SyntheticTechnicianVisit[];
  codes: SyntheticCode[];
};

// ---------------------------------------------------------------------------
// Code dictionary

const FAULT_CODES: ReadonlyArray<readonly [string, string]> = [
  ["F-DISP-01", "Sularaha väljastusmooduli tõrge"],
  ["F-CARD-02", "Kaardilugeja tõrge"],
  ["F-RCPT-03", "Tšekiprinteri tõrge"],
  ["F-COMM-04", "Sideühenduse tõrge"],
  ["F-PWR-05", "Toite- või taaskäivitushäire"],
  ["F-SAFE-06", "Seifi või ukseanduri häire"],
  ["F-SCRN-07", "Ekraani või klaviatuuri tõrge"],
];

const RESOLUTION_CODES: ReadonlyArray<readonly [string, string]> = [
  ["R-PART", "Varuosa vahetus"],
  ["R-ADJ", "Puhastus või reguleerimine"],
  ["R-RST", "Tarkvara või seadme taaskäivitus"],
  ["R-EXT", "Väline põhjus (side, toide)"],
  ["R-NFF", "Viga ei kordunud"],
];

// Visit outcomes (free text in the domain model).
const RESOLVED = "Lahendatud";
const REVISIT = "Vajab korduskülastust";
const WAIT_PART = "Ootel – varuosa";
const WAIT_THIRD_PARTY = "Ootel – kolmas osapool";

// ---------------------------------------------------------------------------
// Compact source definitions

type VisitDef = {
  at: string;
  actions: string;
  comment: string | null;
  resolution: string | null;
  outcome: string | null;
};

type WorkOrderDef = {
  externalId: string;
  workType: WorkType;
  status: WorkOrderStatus;
  registeredAt: string;
  faultCode?: string;
  description: string;
  visits?: VisitDef[];
};

type AtmDef = {
  atmNumber: string;
  model: string;
  workOrders: WorkOrderDef[];
};

const MAINTENANCE_DESCRIPTION =
  "Plaaniline hooldus: puhastus, andurite ja kassettide kontroll, tarkvara versiooni kontroll.";

function maintenance(
  externalId: string,
  registeredAt: string,
  visitAt: string,
  comment = "Märkusi ei ole.",
): WorkOrderDef {
  return {
    externalId,
    workType: "MAINTENANCE",
    status: "CLOSED",
    registeredAt,
    description: MAINTENANCE_DESCRIPTION,
    visits: [
      {
        at: visitAt,
        actions: "Teostatud plaaniline hooldus vastavalt kontrollnimekirjale.",
        comment,
        resolution: null,
        outcome: RESOLVED,
      },
    ],
  };
}

const ATM_DEFINITIONS: AtmDef[] = [
  {
    atmNumber: "ATM-0101",
    model: "Kassaline K5",
    workOrders: [
      {
        externalId: "WO-24811",
        workType: "FAULT_CALL",
        status: "CLOSED",
        registeredAt: "2026-03-14T09:20:00Z",
        faultCode: "F-DISP-01",
        description:
          "Automaat ei väljasta sularaha, ekraanil teade „Teenus ajutiselt kättesaamatu“.",
        visits: [
          {
            at: "2026-03-14T13:05:00Z",
            actions: "Eemaldatud kinni jäänud rahatähed väljastusmoodulist, puhastatud andurid.",
            comment: "Kassetis 2 olid kortsus rahatähed. Testväljastus korras.",
            resolution: "R-ADJ",
            outcome: RESOLVED,
          },
        ],
      },
      maintenance("WO-25390", "2026-05-06T07:00:00Z", "2026-05-06T10:30:00Z"),
      {
        externalId: "WO-26102",
        workType: "FAULT_CALL",
        status: "CLOSED",
        registeredAt: "2026-07-22T15:40:00Z",
        faultCode: "F-DISP-01",
        description: "Klient teatas, et raha jäi väljastuspilusse kinni.",
        visits: [
          {
            at: "2026-07-23T08:10:00Z",
            actions: "Kontrollitud väljastusmoodulit, vahetatud transpordirihm.",
            comment: "Rihm oli kulunud ja vahetati. Testväljastus 20 tsüklit korras.",
            resolution: "R-PART",
            outcome: RESOLVED,
          },
        ],
      },
      {
        externalId: "WO-27015",
        workType: "FAULT_CALL",
        status: "CLOSED",
        registeredAt: "2026-09-30T11:05:00Z",
        faultCode: "F-DISP-01",
        description:
          "Väljastusmoodul annab korduvalt veateate, automaat lülitub hooldusrežiimi.",
        visits: [
          {
            at: "2026-09-30T15:20:00Z",
            actions: "Tehtud diagnostika, puhastatud väljastusmooduli andurid, automaat taaskäivitatud.",
            comment:
              "Viga kordus kahe tunni pärast. Vajalik etteandemooduli vahetus, varuosa tellitud.",
            resolution: null,
            outcome: REVISIT,
          },
          {
            at: "2026-10-02T09:45:00Z",
            actions: "Paigaldatud uus etteandemoodul.",
            comment: "Testväljastus korras, kuid kassett 3 annab hoiatuse.",
            resolution: null,
            outcome: REVISIT,
          },
          {
            at: "2026-10-03T10:30:00Z",
            actions: "Vahetatud kasseti 3 andur, tehtud täielik test.",
            comment: "Kõik kassetid töötavad, testväljastus korras.",
            resolution: "R-PART",
            outcome: RESOLVED,
          },
        ],
      },
      {
        externalId: "WO-27480",
        workType: "FAULT_CALL",
        status: "HOLD",
        registeredAt: "2026-10-21T08:50:00Z",
        faultCode: "F-DISP-01",
        description: "Automaat väljastas kliendile soovitust väiksema summa.",
        visits: [
          {
            at: "2026-10-21T13:15:00Z",
            actions: "Kontrollitud väljastusmoodulit ja kassette, tehtud logide väljavõte.",
            comment:
              "Logides on väljastusviga kassetist 1. Vajalik kasseti vahetus, ootame varuosa tarnet.",
            resolution: null,
            outcome: WAIT_PART,
          },
        ],
      },
      {
        externalId: "WO-27602",
        workType: "FAULT_CALL",
        status: "OPEN",
        registeredAt: "2026-10-25T07:35:00Z",
        faultCode: "F-RCPT-03",
        description: "Tšekiprinter ei prindi, paberit on piisavalt.",
      },
    ],
  },
  {
    atmNumber: "ATM-0102",
    model: "Kassaline K5",
    workOrders: [
      maintenance("WO-24950", "2026-04-02T07:30:00Z", "2026-04-02T11:00:00Z"),
      {
        externalId: "WO-25811",
        workType: "FAULT_CALL",
        status: "CLOSED",
        registeredAt: "2026-06-17T12:10:00Z",
        faultCode: "F-CARD-02",
        description: "Kaardilugeja ei loe kaarte, kliendid ei saa tehingut alustada.",
        visits: [
          {
            at: "2026-06-17T16:40:00Z",
            actions: "Puhastatud kaardilugeja, vahetatud rullikud.",
            comment: "Lugeja pea oli määrdunud. Pärast puhastust test 10 kaardiga korras.",
            resolution: "R-PART",
            outcome: RESOLVED,
          },
        ],
      },
      maintenance(
        "WO-26655",
        "2026-08-19T07:00:00Z",
        "2026-08-19T09:45:00Z",
        "Tšekiprinteri rullik vahetatud ennetavalt.",
      ),
      {
        externalId: "WO-27210",
        workType: "FAULT_CALL",
        status: "CLOSED",
        registeredAt: "2026-10-08T10:25:00Z",
        faultCode: "F-COMM-04",
        description: "Automaat ei saa ühendust keskserveriga, tehingud katkevad.",
        visits: [
          {
            at: "2026-10-08T14:00:00Z",
            actions: "Kontrollitud võrguseadmeid ja kaabeldust.",
            comment:
              "Automaadi riistvara korras. Sidekatkestus oli sideteenuse pakkuja poolel ja taastus kell 13:40.",
            resolution: "R-EXT",
            outcome: RESOLVED,
          },
        ],
      },
      {
        externalId: "WO-27455",
        workType: "FAULT_CALL",
        status: "HOLD",
        registeredAt: "2026-10-19T14:30:00Z",
        faultCode: "F-CARD-02",
        description: "Kaardilugeja jätab kaardi automaati kinni.",
        visits: [
          {
            at: "2026-10-19T17:50:00Z",
            actions: "Eemaldatud kinni jäänud kaardid, puhastatud lugeja.",
            comment: "Viga kordus testimisel. Vajalik kaardilugeja vahetus.",
            resolution: null,
            outcome: REVISIT,
          },
          {
            at: "2026-10-22T09:10:00Z",
            actions: "Kontrollitud lugeja ühendusi, uuendatud lugeja püsivara.",
            comment:
              "Püsivara uuendus ei aidanud. Uus kaardilugeja tellitud, tarne eeldatavalt järgmisel nädalal.",
            resolution: null,
            outcome: WAIT_PART,
          },
        ],
      },
      {
        externalId: "WO-27590",
        workType: "FAULT_CALL",
        status: "OPEN",
        registeredAt: "2026-10-24T18:20:00Z",
        faultCode: "F-SCRN-07",
        description: "Klaviatuuri klahv 5 ei reageeri.",
      },
    ],
  },
  {
    atmNumber: "ATM-0103",
    model: "Kassaline K7",
    workOrders: [
      maintenance("WO-25012", "2026-04-15T07:00:00Z", "2026-04-15T10:15:00Z"),
      {
        externalId: "WO-25640",
        workType: "FAULT_CALL",
        status: "CLOSED",
        registeredAt: "2026-06-03T09:00:00Z",
        faultCode: "F-PWR-05",
        description: "Automaat lülitus välja, ekraan on pime.",
        visits: [
          {
            at: "2026-06-03T12:30:00Z",
            actions: "Kontrollitud toiteplokki ja UPS-i.",
            comment:
              "Hoones oli plaaniline elektrikatkestus. Pärast toite taastumist automaat käivitus, test korras.",
            resolution: "R-EXT",
            outcome: RESOLVED,
          },
        ],
      },
      {
        externalId: "WO-26420",
        workType: "FAULT_CALL",
        status: "CLOSED",
        registeredAt: "2026-08-05T13:15:00Z",
        faultCode: "F-RCPT-03",
        description: "Tšekid prinditakse loetamatult.",
        visits: [
          {
            at: "2026-08-06T09:00:00Z",
            actions: "Vahetatud printeri termopea.",
            comment: "Termopea oli kulunud. Testtšekid loetavad.",
            resolution: "R-PART",
            outcome: RESOLVED,
          },
        ],
      },
      maintenance("WO-26990", "2026-09-23T07:00:00Z", "2026-09-23T10:40:00Z"),
      {
        externalId: "WO-27350",
        workType: "FAULT_CALL",
        status: "CLOSED",
        registeredAt: "2026-10-13T16:45:00Z",
        faultCode: "F-SCRN-07",
        description: "Puuteekraan ei reageeri ülemises osas.",
        visits: [
          {
            at: "2026-10-14T10:00:00Z",
            actions: "Kalibreeritud puuteekraan, automaat taaskäivitatud.",
            comment: "Pärast kalibreerimist reageerib ekraan kogu ulatuses.",
            resolution: "R-ADJ",
            outcome: RESOLVED,
          },
        ],
      },
      {
        // Hold call whose visit has no technician comment in the source data.
        externalId: "WO-27520",
        workType: "FAULT_CALL",
        status: "HOLD",
        registeredAt: "2026-10-22T10:10:00Z",
        faultCode: "F-COMM-04",
        description: "Automaat kaotab perioodiliselt võrguühenduse.",
        visits: [
          {
            at: "2026-10-22T15:30:00Z",
            actions: "Vahetatud võrgukaabel, kontrollitud ruuterit.",
            comment: null,
            resolution: null,
            outcome: WAIT_THIRD_PARTY,
          },
        ],
      },
    ],
  },
  {
    atmNumber: "ATM-0104",
    model: "Numera DX-200",
    workOrders: [
      {
        externalId: "WO-24705",
        workType: "FAULT_CALL",
        status: "CLOSED",
        registeredAt: "2026-02-26T10:40:00Z",
        faultCode: "F-SAFE-06",
        description: "Seifi ukseandur annab häire, kuigi uks on suletud.",
        visits: [
          {
            at: "2026-02-26T15:00:00Z",
            actions: "Reguleeritud ukseandurit.",
            comment: "Andur oli nihkunud. Pärast reguleerimist häire ei kordu.",
            resolution: "R-ADJ",
            outcome: RESOLVED,
          },
        ],
      },
      maintenance("WO-25200", "2026-04-28T07:00:00Z", "2026-04-28T09:30:00Z"),
      {
        externalId: "WO-26300",
        workType: "FAULT_CALL",
        status: "CLOSED",
        registeredAt: "2026-07-29T08:30:00Z",
        faultCode: "F-DISP-01",
        description:
          "Väljastusmoodul teatab rahatähtede puudumisest, kuigi kassetid on täidetud.",
        visits: [
          {
            at: "2026-07-29T11:45:00Z",
            actions: "Puhastatud kasseti andurid, kontrollitud kassette.",
            comment: "Kasseti 1 andur oli määrdunud. Pärast puhastamist tuvastus korras.",
            resolution: "R-ADJ",
            outcome: RESOLVED,
          },
        ],
      },
      {
        externalId: "WO-27100",
        workType: "FAULT_CALL",
        status: "CLOSED",
        registeredAt: "2026-10-01T09:15:00Z",
        faultCode: "F-CARD-02",
        description: "Kaardilugeja annab vahelduvalt lugemisvea.",
        visits: [
          {
            at: "2026-10-01T13:20:00Z",
            actions: "Tehtud diagnostika, puhastatud kaardilugeja.",
            comment: "Viga ei õnnestunud korrata. Lugeja puhastati ennetavalt.",
            resolution: "R-NFF",
            outcome: RESOLVED,
          },
        ],
      },
      maintenance("WO-27380", "2026-10-15T07:00:00Z", "2026-10-15T10:20:00Z"),
      {
        externalId: "WO-27570",
        workType: "FAULT_CALL",
        status: "OPEN",
        registeredAt: "2026-10-23T12:45:00Z",
        faultCode: "F-PWR-05",
        description: "Automaat taaskäivitub iseeneslikult mitu korda päevas.",
      },
    ],
  },
  {
    atmNumber: "ATM-0105",
    model: "Numera DX-200",
    workOrders: [
      {
        externalId: "WO-25105",
        workType: "FAULT_CALL",
        status: "CLOSED",
        registeredAt: "2026-04-20T14:20:00Z",
        faultCode: "F-COMM-04",
        description: "Automaat on võrgust väljas, tehinguid ei toimu.",
        visits: [
          {
            at: "2026-04-20T17:05:00Z",
            actions: "Taaskäivitatud automaadi sidetarkvara, kontrollitud ühendust.",
            comment: "Sideprotsess oli hangunud. Pärast taaskäivitust ühendus stabiilne.",
            resolution: "R-RST",
            outcome: RESOLVED,
          },
        ],
      },
      maintenance("WO-25930", "2026-06-24T07:00:00Z", "2026-06-24T10:00:00Z"),
      {
        externalId: "WO-26810",
        workType: "FAULT_CALL",
        status: "CLOSED",
        registeredAt: "2026-09-02T10:00:00Z",
        faultCode: "F-RCPT-03",
        description: "Tšekiprinteri paber jääb kinni.",
        visits: [
          {
            at: "2026-09-02T14:10:00Z",
            actions: "Eemaldatud kinni jäänud paber, puhastatud paberitee.",
            comment: "Paberirull oli valesti paigaldatud. Paigaldati uuesti, test korras.",
            resolution: "R-ADJ",
            outcome: RESOLVED,
          },
        ],
      },
      {
        externalId: "WO-27280",
        workType: "FAULT_CALL",
        status: "CLOSED",
        registeredAt: "2026-10-10T11:30:00Z",
        faultCode: "F-DISP-01",
        description: "Väljastusmoodul teeb ebatavalist häält ja katkestab väljastuse.",
        visits: [
          {
            at: "2026-10-10T15:00:00Z",
            actions: "Puhastatud väljastusmoodul.",
            comment: "Viga kordus. Vaja vahetada väljastusmooduli rihm, varuosa tellitud.",
            resolution: null,
            outcome: REVISIT,
          },
          {
            at: "2026-10-12T09:30:00Z",
            actions: "Vahetatud väljastusmooduli rihm.",
            comment: "Testväljastus korras.",
            resolution: "R-PART",
            outcome: RESOLVED,
          },
        ],
      },
      {
        externalId: "WO-27495",
        workType: "FAULT_CALL",
        status: "HOLD",
        registeredAt: "2026-10-20T09:40:00Z",
        faultCode: "F-SAFE-06",
        description: "Seifi lukk ei avane hoolduskoodiga.",
        visits: [
          {
            at: "2026-10-20T13:00:00Z",
            actions: "Kontrollitud lukustusmehhanismi ja toidet.",
            comment:
              "Elektrooniline lukk ei reageeri. Avamiseks on vaja seifi hooldaja volitatud tehnikut, tellimus edastatud.",
            resolution: null,
            outcome: WAIT_THIRD_PARTY,
          },
        ],
      },
      {
        // Scheduled maintenance that is still open; it must not appear among fault calls.
        externalId: "WO-27610",
        workType: "MAINTENANCE",
        status: "OPEN",
        registeredAt: "2026-10-25T06:30:00Z",
        description: MAINTENANCE_DESCRIPTION,
      },
    ],
  },
  {
    atmNumber: "ATM-0106",
    model: "Kassaline K7",
    workOrders: [
      maintenance("WO-25300", "2026-05-12T07:00:00Z", "2026-05-12T09:50:00Z"),
      {
        externalId: "WO-26050",
        workType: "FAULT_CALL",
        status: "CLOSED",
        registeredAt: "2026-07-14T10:50:00Z",
        faultCode: "F-SCRN-07",
        description: "Ekraanil on vertikaalsed triibud.",
        visits: [
          {
            at: "2026-07-15T09:00:00Z",
            actions: "Vahetatud ekraani kaabel.",
            comment: "Kaabli pistik oli oksüdeerunud. Pärast vahetust pilt korras.",
            resolution: "R-PART",
            outcome: RESOLVED,
          },
        ],
      },
      {
        externalId: "WO-26700",
        workType: "FAULT_CALL",
        status: "CLOSED",
        registeredAt: "2026-08-26T17:25:00Z",
        faultCode: "F-PWR-05",
        description: "UPS annab helisignaali ja automaat lülitub korraks välja.",
        visits: [
          {
            at: "2026-08-27T08:40:00Z",
            actions: "Vahetatud UPS-i aku.",
            comment: "Aku mahtuvus oli langenud. Pärast vahetust toide stabiilne.",
            resolution: "R-PART",
            outcome: RESOLVED,
          },
        ],
      },
      maintenance("WO-27150", "2026-10-05T07:00:00Z", "2026-10-05T09:35:00Z"),
      {
        // Open call that already has a visit and awaits a return visit.
        externalId: "WO-27410",
        workType: "FAULT_CALL",
        status: "OPEN",
        registeredAt: "2026-10-17T13:55:00Z",
        faultCode: "F-CARD-02",
        description: "Kaardilugeja kate on lahti, võimalik füüsiline kahjustus.",
        visits: [
          {
            at: "2026-10-18T09:30:00Z",
            actions: "Kontrollitud kaardilugeja ümbrist, kate ajutiselt kinnitatud.",
            comment: "Katte kinnitus on purunenud. Vajalik korduskülastus uue kattega.",
            resolution: null,
            outcome: REVISIT,
          },
        ],
      },
      {
        externalId: "WO-27540",
        workType: "FAULT_CALL",
        status: "OPEN",
        registeredAt: "2026-10-23T08:05:00Z",
        faultCode: "F-RCPT-03",
        description: "Tšekiprinter annab paberiummistuse teate.",
      },
    ],
  },
  {
    // Device with limited fault history.
    atmNumber: "ATM-0107",
    model: "Numera DX-300",
    workOrders: [
      maintenance(
        "WO-26200",
        "2026-07-08T07:00:00Z",
        "2026-07-08T09:00:00Z",
        "Paigaldusjärgne ülevaatus tehtud, märkusi ei ole.",
      ),
      {
        externalId: "WO-27050",
        workType: "FAULT_CALL",
        status: "CLOSED",
        registeredAt: "2026-09-28T15:10:00Z",
        faultCode: "F-SCRN-07",
        description: "Ekraani heledus on väga madal, teksti on raske lugeda.",
        visits: [
          {
            at: "2026-09-29T10:00:00Z",
            actions: "Reguleeritud ekraani heledust seadetes.",
            comment: "Heledus oli seadistatud miinimumile. Pärast reguleerimist korras.",
            resolution: "R-ADJ",
            outcome: RESOLVED,
          },
        ],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Builder

const atmId = (atmNumber: string) => `syn-atm-${atmNumber.toLowerCase()}`;
const workOrderId = (externalId: string) => `syn-wo-${externalId.toLowerCase()}`;
const codeId = (codeType: CodeType, code: string) =>
  `syn-code-${codeType.toLowerCase()}-${code.toLowerCase()}`;

/** Builds a fresh copy of the dataset. Output is identical on every call. */
export function buildSyntheticDataset(): SyntheticDataset {
  const atms: SyntheticAtm[] = [];
  const workOrders: SyntheticWorkOrder[] = [];
  const technicianVisits: SyntheticTechnicianVisit[] = [];

  for (const atm of ATM_DEFINITIONS) {
    const atmRecordId = atmId(atm.atmNumber);
    atms.push({ id: atmRecordId, atmNumber: atm.atmNumber, model: atm.model });

    for (const wo of atm.workOrders) {
      const woRecordId = workOrderId(wo.externalId);
      workOrders.push({
        id: woRecordId,
        atmId: atmRecordId,
        externalId: wo.externalId,
        sourceSystem: SOURCE_SYSTEM,
        workType: wo.workType,
        status: wo.status,
        registeredAt: new Date(wo.registeredAt),
        faultCode: wo.faultCode ?? null,
        originalDescription: wo.description,
      });

      (wo.visits ?? []).forEach((visit, index) => {
        technicianVisits.push({
          id: `${woRecordId}-v${index + 1}`,
          workOrderId: woRecordId,
          visitedAt: new Date(visit.at),
          actions: visit.actions,
          originalComment: visit.comment,
          resolutionCode: visit.resolution,
          outcome: visit.outcome,
        });
      });
    }
  }

  const codes: SyntheticCode[] = [
    ...FAULT_CODES.map(([code, description]) => ({
      id: codeId("FAULT", code),
      codeType: "FAULT" as const,
      code,
      description,
    })),
    ...RESOLUTION_CODES.map(([code, description]) => ({
      id: codeId("RESOLUTION", code),
      codeType: "RESOLUTION" as const,
      code,
      description,
    })),
  ];

  return { referenceDate: REFERENCE_DATE, atms, workOrders, technicianVisits, codes };
}

// ---------------------------------------------------------------------------
// Validation (used by tests and by the seed script before writing anything)

export function validateSyntheticDataset(dataset: SyntheticDataset): string[] {
  const errors: string[] = [];
  const unique = (label: string, values: string[]) => {
    const seen = new Set<string>();
    for (const value of values) {
      if (seen.has(value)) errors.push(`Duplicate ${label}: ${value}`);
      seen.add(value);
    }
  };

  unique("ATM id", dataset.atms.map((a) => a.id));
  unique("ATM number", dataset.atms.map((a) => a.atmNumber));
  unique("work order id", dataset.workOrders.map((w) => w.id));
  unique(
    "work order source key",
    dataset.workOrders.map((w) => `${w.sourceSystem}:${w.externalId}`),
  );
  unique("technician visit id", dataset.technicianVisits.map((v) => v.id));
  unique("code id", dataset.codes.map((c) => c.id));
  unique("code", dataset.codes.map((c) => `${c.codeType}:${c.code}`));

  const atmIds = new Set(dataset.atms.map((a) => a.id));
  const workOrdersById = new Map(dataset.workOrders.map((w) => [w.id, w]));
  const faultCodes = new Set(
    dataset.codes.filter((c) => c.codeType === "FAULT").map((c) => c.code),
  );
  const resolutionCodes = new Set(
    dataset.codes.filter((c) => c.codeType === "RESOLUTION").map((c) => c.code),
  );

  for (const wo of dataset.workOrders) {
    if (!atmIds.has(wo.atmId)) errors.push(`${wo.id}: unknown ATM ${wo.atmId}`);
    if (!WORK_TYPES.includes(wo.workType)) errors.push(`${wo.id}: invalid work type`);
    if (!WORK_ORDER_STATUSES.includes(wo.status)) errors.push(`${wo.id}: invalid status`);
    if (Number.isNaN(wo.registeredAt.getTime())) errors.push(`${wo.id}: invalid registeredAt`);
    if (wo.registeredAt > REFERENCE_END) errors.push(`${wo.id}: registered after reference date`);
    if (!wo.originalDescription.trim()) errors.push(`${wo.id}: empty description`);
    if (wo.workType === "FAULT_CALL" && (!wo.faultCode || !faultCodes.has(wo.faultCode))) {
      errors.push(`${wo.id}: fault call needs a known fault code`);
    }
    if (wo.workType === "MAINTENANCE" && wo.faultCode !== null) {
      errors.push(`${wo.id}: maintenance order must not have a fault code`);
    }
  }

  for (const visit of dataset.technicianVisits) {
    const wo = workOrdersById.get(visit.workOrderId);
    if (!wo) {
      errors.push(`${visit.id}: unknown work order ${visit.workOrderId}`);
      continue;
    }
    if (Number.isNaN(visit.visitedAt.getTime())) errors.push(`${visit.id}: invalid visitedAt`);
    if (visit.visitedAt < wo.registeredAt) errors.push(`${visit.id}: visit before registration`);
    if (visit.visitedAt > REFERENCE_END) errors.push(`${visit.id}: visit after reference date`);
    if (!visit.actions.trim()) errors.push(`${visit.id}: empty actions`);
    if (visit.resolutionCode !== null && !resolutionCodes.has(visit.resolutionCode)) {
      errors.push(`${visit.id}: unknown resolution code ${visit.resolutionCode}`);
    }
  }

  return errors;
}
