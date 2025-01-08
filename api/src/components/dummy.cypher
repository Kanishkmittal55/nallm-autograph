CREATE (patent:Patent {documentId: "US 20240398687 A1", title: "Hybrid Nail Composition", publicationDate: "2024-12-05"});
CREATE (application:Application {applicationNumber: "18/679749", filingDate: "2024-05-31", typeCode: "03"});

CREATE (inventor1:Inventor {name: "I-fan Hsieh", city: "Scotch Plains", state: "NJ", country: "US"});
CREATE (inventor2:Inventor {name: "Ramakrishnan Hariharan", city: "Springfield", state: "NJ", country: "US"});

MATCH (p:Patent {documentId: "US 20240398687 A1"}), (i1:Inventor {name: "I-fan Hsieh"}), (i2:Inventor {name: "Ramakrishnan Hariharan"})
CREATE (p)-[:inventedBy]->(i1);
CREATE (p)-[:inventedBy]->(i2);

CREATE (assignee:Company {name: "L'Oréal Paris", city: "Paris", country: "FR", typeCode: "03"});

MATCH (p:Patent {documentId: "US 20240398687 A1"}), (c:Company {name: "L'Oréal Paris"})
CREATE (p)-[:assignedTo]->(c);

CREATE (domesticPriority:Priority {type: "Domestic", applicationNumber: "US 63469992", filingDate: "2023-05-31"});
CREATE (foreignPriority:Priority {type: "Foreign", applicationNumber: "2308063", filingDate: "2023-07-26", country: "FR"});

MATCH (a:Application {applicationNumber: "18/679749"}), (dp:Priority {applicationNumber: "US 63469992"}), (fp:Priority {applicationNumber: "2308063"})
CREATE (a)-[:hasPriority]->(dp);
CREATE (a)-[:hasPriority]->(fp);

CREATE (classification1:CPC {type: "CPCI", code: "A 61 Q 3/02", effectiveDate: "2013-01-01"});
CREATE (classification2:CPC {type: "CPCI", code: "A 61 K 8/87", effectiveDate: "2013-01-01"});
CREATE (classification3:CPC {type: "CPCI", code: "A 45 D 29/00", effectiveDate: "2013-01-01"});
CREATE (classification4:CPC {type: "CPCI", code: "A 61 K 8/41", effectiveDate: "2013-01-01"});
CREATE (classification5:CPC {type: "CPCI", code: "A 61 K 8/731", effectiveDate: "2013-01-01"});

MATCH (p:Patent {documentId: "US 20240398687 A1"}), (c1:CPC {code: "A 61 Q 3/02"}), (c2:CPC {code: "A 61 K 8/87"}), (c3:CPC {code: "A 45 D 29/00"}), (c4:CPC {code: "A 61 K 8/41"}), (c5:CPC {code: "A 61 K 8/731"})
CREATE (p)-[:classifiedAs]->(c1);
CREATE (p)-[:classifiedAs]->(c2);
CREATE (p)-[:classifiedAs]->(c3);
CREATE (p)-[:classifiedAs]->(c4);
CREATE (p)-[:classifiedAs]->(c5);

MATCH (p:Patent {documentId: "US 20240398687 A1"}), (a:Application {applicationNumber: "18/679749"})
CREATE (p)-[:filedAs]->(a);

CREATE (publicationType:PublicationType {type: "A1", description: "Indicates a patent application publication"});

MATCH (p:Patent {documentId: "US 20240398687 A1"}), (pt:PublicationType {type: "A1"})
CREATE (p)-[:publicationType]->(pt);
