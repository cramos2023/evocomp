
import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/modules/job-evaluation/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/modules/job-evaluation/components/ui/card";


import { useTranslation } from "react-i18next";

const InnovationComplexityMatrix = () => {
  const { t } = useTranslation("jobEvaluation");

  // Column headers for complexity levels
  const complexityLevels = [
    { value: 1, label: t("matrix.complexity.1.label", "Defined"), description: t("matrix.complexity.1.desc", "Problems and issues to be addressed generally fall within a single job area or discipline; scope of problem is well-defined") },
    { value: 2, label: t("matrix.complexity.2.label", "Difficult"), description: t("matrix.complexity.2.desc", "Problems and issues may be only vaguely defined and require understanding and consideration of other disciplines and job areas") },
    { value: 3, label: t("matrix.complexity.3.label", "Complex"), description: t("matrix.complexity.3.desc", "Problems and issues require broad-based solutions requiring consideration of two of three dimensions - Operational, Financial and Human") },
    { value: 4, label: t("matrix.complexity.4.label", "Multi-dimensional"), description: t("matrix.complexity.4.desc", "Problems and issues are truly multi-dimensional requiring end-to-end solutions with direct impact on all three dimensions - Operational, Financial and Human") }
  ];

  // Row headers for innovation levels
  const innovationLevels = [
    { value: 1, label: t("matrix.innovation.1.label", "Follow"), description: t("matrix.innovation.1.desc", "Compare with a source, original, or authority on; changes are expected") },
    { value: 2, label: t("matrix.innovation.2.label", "Check"), description: t("matrix.innovation.2.desc", "Make minor changes") },
    { value: 3, label: t("matrix.innovation.3.label", "Modify"), description: t("matrix.innovation.3.desc", "Adapt or enhance quality or value in existing methods to make better as part of day-to-day activities") },
    { value: 4, label: t("matrix.innovation.4.label", "Improve"), description: t("matrix.innovation.4.desc", "Change significantly by enhancing entire existing processes, systems or products") },
    { value: 5, label: t("matrix.innovation.5.label", "Create / Conceptualize"), description: t("matrix.innovation.5.desc", "Develop truly new concepts or methods that break new ground") },
    { value: 6, label: t("matrix.innovation.6.label", "Scientific / Technical Breakthrough"), description: t("matrix.innovation.6.desc", "Form and bring into existence major new or revolutionary advances in knowledge or technique") }
  ];

  // Innovation-Complexity detailed matrix content
  const detailedMatrix = [
    // Row 1 - Follow
    [
      t("matrix.innovation_complexity.1.1", "Follow a set procedure in performance of repeated tasks or job activities"),
      t("matrix.innovation_complexity.1.2", "Follow a well established and familiar set of job activities or a job process to derive a solution"),
      t("matrix.innovation_complexity.1.3", "Follow a set of job activities or process, and face issues and problems that are difficult to deal with, manage, or overcome"),
      t("matrix.innovation_complexity.1.4", "Follow processes and face issues and problems that are difficult to deal with, manage, or overcome")
    ],
    // Row 2 - Check
    [
      t("matrix.innovation_complexity.2.1", "Check problems in existing systems or process"),
      t("matrix.innovation_complexity.2.2", "Check and correct problems that are not immediately evident in existing systems or process"),
      t("matrix.innovation_complexity.2.3", "Identify, define and develop solutions to issues and problems that are not immediately evident in existing systems or process"),
      t("matrix.innovation_complexity.2.4", "Identify, define, address and solve multi-dimensional issues and problems that are not immediately evident in existing systems or processes")
    ],
    // Row 3 - Modify
    [
      t("matrix.innovation_complexity.3.1", "Update or modify working methods in own role based upon defined procedures"),
      t("matrix.innovation_complexity.3.2", "Identify problems and update or modify working methods in own role without the benefit of defined procedures"),
      t("matrix.innovation_complexity.3.3", "Analyze complex issues and modify working methods in own work area"),
      t("matrix.innovation_complexity.3.4", "Extensively analyze complex multi-dimensional issues and modify working methods in own work area")
    ],
    // Row 4 - Improve
    [
      t("matrix.innovation_complexity.4.1", "Significantly improve, change or adapt existing methods and techniques drawing from personal experiences and feedback"),
      t("matrix.innovation_complexity.4.2", "Identify problems and significantly improve, change or adapt existing methods and techniques drawing from personal experiences and feedback"),
      t("matrix.innovation_complexity.4.3", "Analyze complex issues and significantly improve, change or adapt existing methods and techniques"),
      t("matrix.innovation_complexity.4.4", "Extensively analyze complex multi-dimensional issues and significantly improve, change or adapt existing methods and techniques")
    ],
    // Row 5 - Create/Conceptualize
    [
      t("matrix.innovation_complexity.5.1", "Create/conceptualize truly new methods, techniques and/or processes in a single job area/function"),
      t("matrix.innovation_complexity.5.2", "Create/conceptualize truly new methods, techniques and/or processes across job areas or functions"),
      t("matrix.innovation_complexity.5.3", "Analyze complex issues before creating/conceptualizing truly new methods, techniques and/or processes across job areas or functions"),
      t("matrix.innovation_complexity.5.4", "Extensively analyze complex multi-dimensional issues and create/conceptualize truly new methods, techniques and/or processes across job areas or functions")
    ],
    // Row 6 - Scientific/Technical Breakthrough
    [
      t("matrix.innovation_complexity.6.1", "Bring together multiple concepts to define a new direction or a significant advance to products or services in a specific product/service area"),
      t("matrix.innovation_complexity.6.2", "Bring together multiple concepts across job areas to define a new direction or a significant advance to products or services"),
      t("matrix.innovation_complexity.6.3", "Analyze complex issues and bring together multiple concepts across functions to define a new direction or a significant advance to products or services"),
      t("common.not_applicable", "Not Applicable")
    ]
  ];

  return (
    <Card className="w-full shadow-md">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          {t("matrix.innovationComplexity") || "Innovation-Complexity Reference Matrix"}
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <div className="relative">
          <Table className="border">
            <TableHeader>
              <TableRow>
                <TableHead className="bg-muted/50 w-32 border font-bold">
                  {t("matrix.innovationComplexity.axes") || "Innovation ↓ / Complexity →"}
                </TableHead>
                {complexityLevels.map((level) => (
                  <TableHead key={level.value} className="bg-muted/50 border text-center min-w-[160px]">
                    <div className="font-bold">{level.value} - {level.label}</div>
                    <div className="text-xs font-normal">{level.description}</div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {innovationLevels.map((innovLevel, rowIndex) => (
                <TableRow key={innovLevel.value}>
                  <TableCell className="font-semibold bg-muted/30 border">
                    <div className="font-bold">{innovLevel.value} - {innovLevel.label}</div>
                    <div className="text-xs">{innovLevel.description}</div>
                  </TableCell>
                  {complexityLevels.map((_, colIndex) => (
                    <TableCell 
                      key={`${innovLevel.value}-${colIndex+1}`} 
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

export default InnovationComplexityMatrix;
