import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/modules/job-evaluation/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/modules/job-evaluation/components/ui/card";
import { impactContributionTable } from "@/modules/job-evaluation/utils/lookupTables/impactContributionTable";
import { useTranslation } from "react-i18next";

// Matriz detallada con todas las descripciones
const ImpactContributionMatrix = () => {
  const { t } = useTranslation("jobEvaluation");

  const impactLevels = [
    {
      value: 1,
      label: t("matrix.impact.1.label", "Delivery"),
      description: t("matrix.impact.1.desc", "Delivery according to specific standards and guidelines.")
    },
    {
      value: 2,
      label: t("matrix.impact.2.label", "Operation"),
      description: t("matrix.impact.2.desc", "Work achieves objectives and delivers results with a short-term, operational focus.")
    },
    {
      value: 3,
      label: t("matrix.impact.3.label", "Tactical"),
      description: t("matrix.impact.3.desc", "Specify new products, processes, standards based on organization strategy or set short- to mid-term operational strategy.")
    },
    {
      value: 4,
      label: t("matrix.impact.4.label", "Strategic"),
      description: t("matrix.impact.4.desc", "Establish and implement business strategies with a longer-term focus (typically three to five years) based on the organization's vision.")
    },
    {
      value: 5,
      label: t("matrix.impact.5.label", "Visionary"),
      description: t("matrix.impact.5.desc", "Lead an organization to develop, implement, and achieve mission, vision and values.")
    }
  ];

  const contributionLevels = [
    {
      value: 1,
      label: t("matrix.contribution.1.label", "Limited"),
      description: t("matrix.contribution.1.desc", "Hard to identify/discern contribution to achievement of results.")
    },
    {
      value: 2,
      label: t("matrix.contribution.2.label", "Some"),
      description: t("matrix.contribution.2.desc", "Easily discernible or measurable contribution that usually leads indirectly to achievement of results.")
    },
    {
      value: 3,
      label: t("matrix.contribution.3.label", "Direct"),
      description: t("matrix.contribution.3.desc", "Directly and clearly influences the course of action that determines the achievement of results.")
    },
    {
      value: 4,
      label: t("matrix.contribution.4.label", "Significant"),
      description: t("matrix.contribution.4.desc", "Quite marked contribution with authority of a frontline or primary nature.")
    },
    {
      value: 5,
      label: t("matrix.contribution.5.label", "Major"),
      description: t("matrix.contribution.5.desc", "Predominant authority in determining the achievement of key results.")
    }
  ];

  // Matriz detallada con descripciones específicas para cada combinación
  const detailedMatrix = [
    // Fila 1 - Delivery
    [
      t("matrix.impact_contribution.1.1", "Deliver according to specific standards and guidelines."),
      t("matrix.impact_contribution.1.2", "Deliver own output by following defined procedures / processes under close supervision and direction."),
      t("matrix.impact_contribution.1.3", "Deliver own output following broad standards or standards with some impact on job area."),
      t("matrix.impact_contribution.1.4", "Deliver own output according to specific operational targets."),
      t("matrix.impact_contribution.1.5", "Deliver own output within broad operational targets. Significant impact within job area.")
    ],
    // Fila 2 - Operation
    [
      t("matrix.impact_contribution.2.1", "Work achieves operational targets or service standards."),
      t("matrix.impact_contribution.2.2", "Work to achieve objectives and deliver results with a short-term, operational focus and limited impact on others."),
      t("matrix.impact_contribution.2.3", "Set and achieve day-to-day objectives that have some impact on others within the job area."),
      t("matrix.impact_contribution.2.4", "Set objectives and deliver results that have direct impact on the achievement of results within the job area."),
      t("matrix.impact_contribution.2.5", "Set objectives and deliver results that have a significant impact within the context of a wider operational area.")
    ],
    // Fila 3 - Tactical
    [
      t("matrix.impact_contribution.3.1", "Specify new products, processes, standards based on organization strategy or set short-to-mid-term operational plans."),
      t("matrix.impact_contribution.3.2", "Provide input into new products, processes, standards or operational plans in support of the organization's business strategies, with limited impact on business unit/function overall results -- less than 10%."),
      t("matrix.impact_contribution.3.3", "Provide measurable input into new products, processes, standards or operational plans in support of the organization's business strategies, with some impact on business unit/function overall results -- 11 to 15%."),
      t("matrix.impact_contribution.3.4", "Develop new products, processes, standards or operational plans in support of the organization's business strategies, with a direct impact on business unit/function overall results -- 16 to 20%."),
      t("matrix.impact_contribution.3.5", "Marked contribution to defining the direction for new products, processes, standards or operational plans (based upon business strategy), with a significant mid-term impact on business unit/function overall results -- 21 to 30%.")
    ],
    // Fila 4 - Strategic
    [
      t("matrix.impact_contribution.4.1", "Establish and implement business strategies with a longer-term focus."),
      t("matrix.impact_contribution.4.2", "Provide input to a corporate business unit or organization's business strategies and results (through a limited scope of the role -- less than 10%."),
      t("matrix.impact_contribution.4.3", "Provide measurable input to a corporate business unit or organization's business strategies and results (through a role or input of others -- 11 up to 15%."),
      t("matrix.impact_contribution.4.4", "Directly influences development of a corporate business unit or organization's business strategies within the context of the overall corporate strategy -- 16 up to 20%."),
      t("matrix.impact_contribution.4.5", "Marked contribution to defining the strategy of a corporate business unit or organization, but not organization as a whole -- 21 to 30%.")
    ],
    // Fila 5 - Visionary
    [
      t("matrix.impact_contribution.5.1", "Lead an organization to develop, implement, and achieve mission, vision and values."),
      t("matrix.impact_contribution.5.2", "Lead an organization with a operational or enterprise business unit, with responsibility for influencing the organization's vision, influence is made by strong direction from other units or headquarters."),
      t("matrix.impact_contribution.5.3", "Lead an organization with a position as corporate business unit/division leader, with strong responsibility for providing organization's policy approval, vision still under significant at the corporate level."),
      t("matrix.impact_contribution.5.4", "Lead an organization with a corporate business unit with responsibility and autonomy for developing the organization's vision, direction relevant in specific corporate division and strategy."),
      t("matrix.impact_contribution.5.5", "Lead an organization with public, private, or government sector corporate business, role, vision, and corporate division under strategic decision making - little influence from the board.")
    ]
  ];

  return (
    <Card className="w-full shadow-md">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{t("matrix.impactContribution")} Reference Matrix</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <div className="relative">
          <Table className="border">
            <TableHeader>
              <TableRow>
                <TableHead className="bg-muted/50 w-32 border font-bold">
                  Impact ↓ / Contribution →
                </TableHead>
                {contributionLevels.map((level) => (
                  <TableHead key={level.value} className="bg-muted/50 border text-center min-w-[160px]">
                    <div className="font-bold">{level.value} - {level.label}</div>
                    <div className="text-xs font-normal">{level.description}</div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {impactLevels.map((impactLevel, rowIndex) => (
                <TableRow key={impactLevel.value}>
                  <TableCell className="font-semibold bg-muted/30 border">
                    <div className="font-bold">{impactLevel.value} - {impactLevel.label}</div>
                    <div className="text-xs">{impactLevel.description}</div>
                  </TableCell>
                  {contributionLevels.map((contLevel, colIndex) => (
                    <TableCell 
                      key={`${impactLevel.value}-${contLevel.value}`} 
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

export default ImpactContributionMatrix;
