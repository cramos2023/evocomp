
import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/modules/job-evaluation/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/modules/job-evaluation/components/ui/card";
import { useTranslation } from "react-i18next";

const KnowledgeTeamsMatrix: React.FC = () => {
  const { t } = useTranslation("jobEvaluation");

  // Knowledge levels
  const knowledgeLevels = [
    {
      value: 1,
      label: t("matrix.knowledge.1.label", "Limited Job Knowledge"),
      description: t("matrix.knowledge.1.desc", "Fundamental knowledge of basic work routines and procedures sufficient to operate within narrow boundaries.")
    },
    {
      value: 2,
      label: t("matrix.knowledge.2.label", "Basic Job Knowledge"),
      description: t("matrix.knowledge.2.desc", "Specialized knowledge of specific common technical, trade, or office procedures.")
    },
    {
      value: 3,
      label: t("matrix.knowledge.3.label", "Broad Job Knowledge"),
      description: t("matrix.knowledge.3.desc", "Broader knowledge of theories and principles within a professional discipline and/or advanced knowledge of specific technical/operational practices.")
    },
    {
      value: 4,
      label: t("matrix.knowledge.4.label", "Expertise"),
      description: t("matrix.knowledge.4.desc", "Advanced/well-developed skills and knowledge within a specific professional discipline involving the integration of theory and principles with organizational practices and precedents.")
    },
    {
      value: 5,
      label: t("matrix.knowledge.5.label", "Professional Standard"),
      description: t("matrix.knowledge.5.desc", "Mastery of a specific professional discipline combining deep knowledge of theory and organizational practice or expertise across several different disciplines within a function or several different job areas across functions.")
    },
    {
      value: 6,
      label: t("matrix.knowledge.6.label", "Org. Generalist / Functional Specialist"),
      description: t("matrix.knowledge.6.desc", "Broad management experience across several functions or businesses, or concentrated knowledge of a particular discipline considered the organization's expert within a particular discipline.")
    },
    {
      value: 7,
      label: t("matrix.knowledge.7.label", "Broad Practical Experience / Functional Preeminence"),
      description: t("matrix.knowledge.7.desc", "Broad and substantive management experience across several line and support functions or businesses, or recognized outside the organization as having paramount capability in a broader discipline.")
    },
    {
      value: 8,
      label: t("matrix.knowledge.8.label", "Broad and Deep Practical Experience"),
      description: t("matrix.knowledge.8.desc", "Very significant management experience in several businesses and most line and support functions combined with deep experience in one or more of the organization's most important functions.")
    }
  ];

  // Teams levels
  const teamsLevels = [
    {
      value: 1,
      label: t("matrix.teams.1.label", "Team Member"),
      description: t("matrix.teams.1.desc", "Follow basic work routines and standards")
    },
    {
      value: 2,
      label: t("matrix.teams.2.label", "Team Leader"),
      description: t("matrix.teams.2.desc", "Lead team to ensure output through implementation of basic work routines and standards")
    },
    {
      value: 3,
      label: t("matrix.teams.3.label", "Teams Manager"),
      description: t("matrix.teams.3.desc", "Manage and lead teams through implementation of basic work routines and standards")
    }
  ];

  // Breadth levels
  const breadthLevels = [
    {
      label: t("matrix.breadth.1.label", "Domestic"),
      description: t("matrix.breadth.1.desc", "Applies knowledge within a country or neighboring countries with similar culture")
    },
    {
      label: t("matrix.breadth.2.label", "Regional"),
      description: t("matrix.breadth.2.desc", "Applies knowledge in a continental region (e.g. Europe, Asia, North America, Latin America, Mena)")
    },
    {
      label: t("matrix.breadth.3.label", "Global"),
      description: t("matrix.breadth.3.desc", "Applies knowledge across all regions of the world")
    }
  ];

  // Matrix detailed descriptions
  const detailedMatrix = [
    // Knowledge 1 row
    [
      t("matrix.knowledge_teams.1.1", "Follow basic work routines and standards"),
      t("matrix.knowledge_teams.1.2", "Lead team to ensure output through implementation of basic work routines and standards"),
      t("matrix.knowledge_teams.1.3", "Manage and lead teams through implementation of basic work routines and standards")
    ],
    // Knowledge 2 row
    [
      t("matrix.knowledge_teams.2.1", "Apply basic knowledge of practices and procedures for one's own position"),
      t("matrix.knowledge_teams.2.2", "Lead team through application of basic knowledge of practices and procedures"),
      t("matrix.knowledge_teams.2.3", "Manage and lead teams through application of basic knowledge of practices and procedures")
    ],
    // Knowledge 3 row
    [
      t("matrix.knowledge_teams.3.1", "Apply knowledge of theories of professional discipline or advanced knowledge of specific technical/operational practices"),
      t("matrix.knowledge_teams.3.2", "Lead team through application of broad knowledge of one job area or basic knowledge of several related job areas"),
      t("matrix.knowledge_teams.3.3", "Manage and lead teams through application of broad knowledge of one job area or basic knowledge of several job areas")
    ],
    // Knowledge 4 row
    [
      t("matrix.knowledge_teams.4.1", "Apply deep knowledge of one job area or broad knowledge of several job areas"),
      t("matrix.knowledge_teams.4.2", "Lead a team through application of broad knowledge of one job area or broad knowledge of several job areas"),
      t("matrix.knowledge_teams.4.3", "Manage and lead teams through deep knowledge of one job area or broad knowledge of several job areas")
    ],
    // Knowledge 5 row
    [
      t("matrix.knowledge_teams.5.1", "Apply mastery of a specific professional discipline or broader expertise in most or all areas within a function"),
      t("matrix.knowledge_teams.5.2", "Lead a team through expertise in most or all areas within a function or mastery of a specific professional discipline"),
      t("matrix.knowledge_teams.5.3", "Manage and lead teams through expertise in most or all areas within a function")
    ],
    // Knowledge 6 row
    [
      t("matrix.knowledge_teams.6.1", "Apply concentrated knowledge of a particular discipline or professional standard knowledge across all job areas within a function"),
      t("matrix.knowledge_teams.6.2", "Lead a team through professional standard knowledge of all job areas within a function, practical expertise in several functional areas or concentrated knowledge of a particular discipline"),
      t("matrix.knowledge_teams.6.3", "Manage and lead teams through professional standard knowledge of all job areas within a function or practical expertise in several functional areas or businesses")
    ],
    // Knowledge 7 row
    [
      t("matrix.knowledge_teams.7.1", "Apply preeminent expertise across functions or within a broader discipline, or broad practical experience in two major functions within or across businesses"),
      t("matrix.knowledge_teams.7.2", "Lead a team through broad practical experience of many major functions within or across businesses, or preeminent expertise across functions or within a broader discipline"),
      t("matrix.knowledge_teams.7.3", "Manage and lead teams through broad practical experience in two major functions within or across businesses")
    ],
    // Knowledge 8 row
    [
      t("common.not_applicable", "Not Applicable"),
      t("common.not_applicable", "Not Applicable"),
      t("matrix.knowledge_teams.8.3", "Manage and lead teams through broad and deep practical experience of most functions across multiple businesses")
    ]
  ];

  return (
    <Card className="w-full shadow-md">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{t("matrix.knowledgeTeams")}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <div className="relative">
          <Table className="border">
            <TableHeader>
              <TableRow>
                <TableHead className="bg-muted/50 w-32 border font-bold">
                  {t("matrix.knowledge")} ↓
                </TableHead>
                <TableHead colSpan={3} className="bg-muted/50 border text-center">
                  {t("matrix.teams")}
                </TableHead>
                <TableHead className="bg-muted/50 border text-center">
                  {t("matrix.breadth")}
                </TableHead>
              </TableRow>
              <TableRow>
                <TableHead className="bg-muted/50 border"></TableHead>
                {teamsLevels.map((level) => (
                  <TableHead key={level.value} className="bg-muted/50 border text-center min-w-[160px]">
                    <div className="font-bold">{level.value}<br/>{level.label}</div>
                  </TableHead>
                ))}
                <TableHead className="bg-muted/50 border"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {knowledgeLevels.map((knowledgeLevel, rowIndex) => (
                <TableRow key={knowledgeLevel.value}>
                  <TableCell className="font-semibold bg-muted/30 border">
                    <div className="font-bold">{knowledgeLevel.value}</div>
                    <div className="font-bold">{knowledgeLevel.label}</div>
                    <div className="text-xs mt-1">{knowledgeLevel.description}</div>
                  </TableCell>
                  {teamsLevels.map((teamLevel, colIndex) => (
                    <TableCell 
                      key={`${knowledgeLevel.value}-${teamLevel.value}`} 
                      className="text-center border p-2 relative"
                    >
                      <div className="text-xs mb-1 min-h-[60px]">
                        {detailedMatrix[rowIndex][colIndex]}
                      </div>
                    </TableCell>
                  ))}
                  <TableCell className="border p-2 align-top text-sm">
                    {rowIndex < 2 ? (
                      <div className="text-xs">
                        <div className="font-bold">{breadthLevels[0].label}</div>
                        {breadthLevels[0].description}
                      </div>
                    ) : rowIndex >= 2 && rowIndex < 5 ? (
                      <div className="text-xs">
                        <div className="font-bold">{breadthLevels[1].label}</div>
                        {breadthLevels[1].description}
                      </div>
                    ) : (
                      <div className="text-xs">
                        <div className="font-bold">{breadthLevels[2].label}</div>
                        {breadthLevels[2].description}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default KnowledgeTeamsMatrix;
