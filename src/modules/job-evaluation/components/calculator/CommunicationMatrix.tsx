
import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/modules/job-evaluation/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/modules/job-evaluation/components/ui/card";
import { useTranslation } from "react-i18next";

const CommunicationMatrix = () => {
  const { t } = useTranslation("jobEvaluation");

  const communicationLevels = [
    {
      value: 1,
      label: t("matrix.communication.1.label", "Convey"),
      description: t("matrix.communication.1.desc", "Communicate information by statement, suggestion, gesture, or appearance")
    },
    {
      value: 2,
      label: t("matrix.communication.2.label", "Adapt and exchange"),
      description: t("matrix.communication.2.desc", "Reach agreement through flexibility and compromise")
    },
    {
      value: 3,
      label: t("matrix.communication.3.label", "Influence"),
      description: t("matrix.communication.3.desc", "Effect change without direct exercise of command where persuasion is required")
    },
    {
      value: 4,
      label: t("matrix.communication.4.label", "Negotiate"),
      description: t("matrix.communication.4.desc", "Come to agreement by managing communications through discussions and compromise. Issues are short-term operational, medium-term tactical or limited strategic nature")
    },
    {
      value: 5,
      label: t("matrix.communication.5.label", "Negotiate Long Term"),
      description: t("matrix.communication.5.desc", "Manage communications of great importance having long-term, strategic implications for the whole organization")
    }
  ];

  const frameLevels = [
    {
      value: 1,
      label: t("matrix.frame.1.label", "Internal Shared Interests"),
      description: t("matrix.frame.1.desc", "Common desire to reach solution within a corporation")
    },
    {
      value: 2,
      label: t("matrix.frame.2.label", "External Shared Interests"),
      description: t("matrix.frame.2.desc", "Common desire to reach solution outside a corporation")
    },
    {
      value: 3,
      label: t("matrix.frame.3.label", "Internal Divergent Interests"),
      description: t("matrix.frame.3.desc", "Conflicting objectives that inhibit reaching a solution within a corporation")
    },
    {
      value: 4,
      label: t("matrix.frame.4.label", "External Divergent Interests"),
      description: t("matrix.frame.4.desc", "Conflicting objectives that inhibit reaching a solution outside a corporation")
    }
  ];

  // Communication-Frame detailed matrix
  const detailedMatrix = [
    // Row 1 - Convey
    [
      t("matrix.communication_frame.1.1", "Communicate information by statement, suggestion, gesture, or appearance"),
      t("matrix.communication_frame.1.2", "Obtain and provide information to others within the organization"),
      t("matrix.communication_frame.1.3", "Obtain and provide information to external parties"),
      t("matrix.communication_frame.1.4", "Obtain and provide information to others within the organization where tact is required to avoid conflict"),
      t("matrix.communication_frame.1.5", "Obtain and provide information to external parties where tact is required to avoid conflict")
    ],
    // Row 2 - Adapt and exchange
    [
      t("matrix.communication_frame.2.1", "Reach agreement through flexibility and compromise"),
      t("matrix.communication_frame.2.2", "Explain facts, practices, policies, etc. to others within the organization"),
      t("matrix.communication_frame.2.3", "Explain facts, practices, policies, etc. to external parties"),
      t("matrix.communication_frame.2.4", "Explain facts, practices, policies, etc. to others within the organization where past practices or divergent views constrain agreement"),
      t("matrix.communication_frame.2.5", "Explain facts, practices, policies, etc. to external parties where there may be skepticism or reluctance to agree")
    ],
    // Row 3 - Influence
    [
      t("matrix.communication_frame.3.1", "Effect change without direct exercise of command where persuasion is required"),
      t("matrix.communication_frame.3.2", "Convince others within the organization where strong interest exists to accept new concepts, practices, and approaches."),
      t("matrix.communication_frame.3.3", "Convince external parties that have a desire to reach agreement to accept new concepts, practices, and approaches."),
      t("matrix.communication_frame.3.4", "Convince others within the organization that are skeptical or unwilling to accept new concepts, practices, and approaches."),
      t("matrix.communication_frame.3.5", "Convince external parties who are skeptical or unwilling to accept new concepts, practices, and approaches.")
    ],
    // Row 4 - Negotiate
    [
      t("matrix.communication_frame.4.1", "Come to agreement by managing communications through discussions and compromise. Issues are short-term operational, medium-term tactical or limited strategic nature"),
      t("matrix.communication_frame.4.2", "Convince others within the organization to accept complete proposals and programs where all parties are willing participants"),
      t("matrix.communication_frame.4.3", "Convince external parties that have a desire to reach agreement to accept complete proposal and programs"),
      t("matrix.communication_frame.4.4", "Convince others in the organization to accept complete proposals and programs where there may be little interest in cooperating or participating"),
      t("matrix.communication_frame.4.5", "Convince external parties to accept complete proposals and programs where there is little interest in cooperating or participating")
    ],
    // Row 5 - Negotiate Long Term
    [
      t("matrix.communication_frame.5.1", "Manage communications of great importance having long-term, strategic implications for the whole organization"),
      t("matrix.communication_frame.5.2", "Reach agreement of strategic importance with others within the organization who have different points of view but a shared objective"),
      t("matrix.communication_frame.5.3", "Reach agreement of strategic importance with others outside the organization that have different points of view but shared interests."),
      t("matrix.communication_frame.5.4", "Reach agreement of strategic importance with others within the organization who have differing perspectives and objectives"),
      t("matrix.communication_frame.5.5", "Reach agreement of strategic importance with others outside the organization who have widely differing perspectives and objectives")
    ]
  ];

  return (
    <Card className="w-full shadow-md">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{t("matrix.communicationFrame")} Reference Matrix</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <div className="relative">
          <Table className="border">
            <TableHeader>
              <TableRow>
                <TableHead className="bg-muted/50 w-32 border font-bold">
                  {t("matrix.communicationFrame.axes") || "Communication ↓ / Frame →"}
                </TableHead>
                {frameLevels.map((level) => (
                  <TableHead key={level.value} className="bg-muted/50 border text-center min-w-[160px]">
                    <div className="font-bold">{level.value} - {level.label}</div>
                    <div className="text-xs font-normal">{level.description}</div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {communicationLevels.map((commLevel, rowIndex) => (
                <TableRow key={commLevel.value}>
                  <TableCell className="font-semibold bg-muted/30 border">
                    <div className="font-bold">{commLevel.value} - {commLevel.label}</div>
                    <div className="text-xs">{commLevel.description}</div>
                  </TableCell>
                  {frameLevels.map((frameLevel, colIndex) => (
                    <TableCell 
                      key={`${commLevel.value}-${frameLevel.value}`} 
                      className="text-center border p-2 relative"
                    >
                      <div className="text-xs mb-1 min-h-[60px]">
                        {detailedMatrix[rowIndex][colIndex]}
                      </div>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default CommunicationMatrix;
