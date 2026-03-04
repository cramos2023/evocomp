// Dimension information data for tooltips and descriptions

export interface DimensionInfo {
  title: string;
  description: string;
  levels: { value: number; label: string; description: string }[];
}

// Dimension information for tooltips and descriptions
export const dimensionInfoData: Record<string, DimensionInfo> = {
  impact: {
    title: "Impact",
    description: "The level of influence and effect the position has on the organization.",
    levels: [
      { value: 1, label: "Delivery", description: "Delivery according to specific standards and guidelines." },
      { value: 2, label: "Operation", description: "Work achieves objectives and delivers results within a short-term, operational focus." },
      { value: 3, label: "Tactical", description: "Specify new products, processes, standards based on organization strategy or set short- to mid-term operational strategy." },
      { value: 4, label: "Strategic", description: "Establish and implement business strategies with a longer-term focus (typically three to five years) based on the organization's vision." },
      { value: 5, label: "Visionary", description: "Lead an organization to develop, implement, and achieve mission, vision and values." }
    ]
  },
  contribution: {
    title: "Contribution",
    description: "The degree to which the position contributes to organizational outcomes.",
    levels: [
      { value: 1, label: "Limited", description: "Hard to identify/discern contribution to achievement of results." },
      { value: 2, label: "Some", description: "Easily discernible or measurable contribution that usually leads indirectly to achievement of results." },
      { value: 3, label: "Direct", description: "Directly and clearly influences the course of action that determines the achievement of results." },
      { value: 4, label: "Significant", description: "Quite marked contribution with authority of a frontline or primary nature." },
      { value: 5, label: "Major", description: "Predominant authority in determining the achievement of key results." }
    ]
  },
  size: {
    title: "Size",
    description: "The organizational scope or scale relevant to the position.",
    levels: [
      { value: 1, label: "1", description: "Organization size of 1" },
      { value: 2, label: "2", description: "Organization size of 2" },
      { value: 3, label: "3", description: "Organization size of 3" },
      { value: 4, label: "4", description: "Organization size of 4" },
      { value: 5, label: "5", description: "Organization size of 5" },
      { value: 6, label: "6", description: "Organization size of 6" },
      { value: 7, label: "7", description: "Organization size of 7" },
      { value: 8, label: "8", description: "Organization size of 8" },
      { value: 9, label: "9", description: "Organization size of 9" },
      { value: 10, label: "10", description: "Organization size of 10" },
      { value: 11, label: "11", description: "Organization size of 11" },
      { value: 12, label: "12", description: "Organization size of 12" },
      { value: 13, label: "13", description: "Organization size of 13" },
      { value: 14, label: "14", description: "Organization size of 14" },
      { value: 15, label: "15", description: "Organization size of 15" },
      { value: 16, label: "16", description: "Organization size of 16" },
      { value: 17, label: "17", description: "Organization size of 17" },
      { value: 18, label: "18", description: "Organization size of 18" },
      { value: 19, label: "19", description: "Organization size of 19" },
      { value: 20, label: "20", description: "Organization size of 20" },
      { value: 21, label: "21", description: "Organization size of 21" },
      { value: 22, label: "22", description: "Organization size of 22" }
    ]
  },
  communication: {
    title: "Communication",
    description: "The nature and complexity of communication required for the position.",
    levels: [
      { value: 1, label: "Transmit", description: "Basic communication through statements or suggestions." },
      { value: 2, label: "Adapt & Exchange", description: "Negotiating and finding compromises through flexibility." },
      { value: 3, label: "Influence", description: "Using persuasion to promote changes or influence decisions." },
      { value: 4, label: "Negotiate", description: "Managing complex discussions and facilitating agreements in critical situations." },
      { value: 5, label: "Long-term Negotiation", description: "Handling strategically important communications and negotiating agreements with lasting impact." }
    ]
  },
  frame: {
    title: "Frame",
    description: "The operational framework or context within which the position functions.",
    levels: [
      { value: 1, label: "Routine", description: "Activities are mostly predictable and governed by established procedures." },
      { value: 2, label: "Varied", description: "Requires choosing among diverse options, involving somewhat more complex decisions." },
      { value: 3, label: "Multifaceted", description: "Coordinates activities of diverse nature and complexity, involving multiple variables." },
      { value: 4, label: "Diverse", description: "Supervises complex and heterogeneous activities spanning different functions and areas of the organization." }
    ]
  },
  innovation: {
    title: "Innovation",
    description: "The level of innovation or creative thinking required by the position.",
    levels: [
      { value: 1, label: "Procedural", description: "Applies established procedures and methods." },
      { value: 2, label: "Improvement", description: "Seeks to improve existing processes without radically altering the method." },
      { value: 3, label: "Creation", description: "Designs new methods or strategies to achieve strategic objectives." },
      { value: 4, label: "Pioneer", description: "Leads revolutionary or unprecedented initiatives in the industry, marking a significant transformation." },
      { value: 5, label: "Breakthrough", description: "Creates revolutionary approaches with industry-wide impact." },
      { value: 6, label: "Transformative", description: "Introduces completely new paradigms that fundamentally change the field." }
    ]
  },
  complexity: {
    title: "Complexity",
    description: "The level of complexity in decision-making and problem-solving required by the position.",
    levels: [
      { value: 1, label: "Simple", description: "Requires basic judgments with few available options." },
      { value: 2, label: "Moderately Complex", description: "Must consider multiple options and make evaluations with a certain degree of judgment." },
      { value: 3, label: "Highly Complex", description: "Decision-making involves consideration of numerous variables and a high level of ambiguity." },
      { value: 4, label: "Extremely Complex", description: "Faces critical decisions with uncertainty and very high impact, requiring deep analysis." }
    ]
  },
  knowledge: {
    title: "Knowledge",
    description: "The depth and breadth of knowledge required for the position.",
    levels: [
      { value: 1, label: "Limited", description: "Based on routines or basic knowledge." },
      { value: 2, label: "Basic", description: "Requires specialized knowledge in a specific area." },
      { value: 3, label: "Broad", description: "Needs a broad understanding of general theories or principles." },
      { value: 4, label: "Expert", description: "Possesses an advanced and integrated understanding in a specific field." },
      { value: 5, label: "Professional Standard", description: "Achieves a level of mastery comparable to a recognized professional." },
      { value: 6, label: "Organizational Specialist", description: "Has deep and specific experience within the organization." },
      { value: 7, label: "Preeminence", description: "Has substantial experience that transcends functional areas." },
      { value: 8, label: "Extensive", description: "Possesses significant and multifaceted experience spanning multiple knowledge areas." }
    ]
  },
  teams: {
    title: "Teams",
    description: "The level of team collaboration and leadership required by the position.",
    levels: [
      { value: 1, label: "Individual Contributor", description: "The role is performed autonomously without depending on direct collaboration." },
      { value: 2, label: "Team Member", description: "Regularly collaborates with others to achieve common objectives." },
      { value: 3, label: "Team Leader", description: "Takes responsibility for directing and coordinating a work group to achieve collective goals." }
    ]
  },
  breadth: {
    title: "Breadth",
    description: "The scope of responsibilities encompassed by the position.",
    levels: [
      { value: 1, label: "Narrow", description: "Functions are very specific and delimited." },
      { value: 1.5, label: "Somewhat Narrow", description: "Functions are mostly specific with limited scope." },
      { value: 2, label: "Moderate", description: "Handles responsibilities of intermediate scope, with some diversity of tasks." },
      { value: 2.5, label: "Somewhat Broad", description: "Handles responsibilities with significant diversity." },
      { value: 3, label: "Broad", description: "Manages a wide range of activities spanning multiple disciplines and functional areas." }
    ]
  },
  risk: {
    title: "Risk",
    description: "The level of risk associated with the position's decision-making authority.",
    levels: [
      { value: 0, label: "None", description: "No significant risk in decision-making." },
      { value: 1, label: "Low", description: "Minimal risk with limited consequences." },
      { value: 1.5, label: "Low-Medium", description: "Some risk with moderate consequences." },
      { value: 2, label: "Medium", description: "Moderate risk with significant consequences." },
      { value: 2.5, label: "Medium-High", description: "Considerable risk with major consequences." },
      { value: 3, label: "High", description: "High risk with critical consequences for the organization." }
    ]
  },
  environment: {
    title: "Environment",
    description: "The operational environment or context complexity in which the position functions.",
    levels: [
      { value: 1, label: "Simple", description: "Straightforward environment with clear parameters." },
      { value: 1.5, label: "Somewhat Simple", description: "Mostly straightforward with occasional complexity." },
      { value: 2, label: "Moderate", description: "Mixed environment with both simple and complex elements." },
      { value: 2.5, label: "Somewhat Complex", description: "Environment with significant complexity and ambiguity." },
      { value: 3, label: "Complex", description: "Highly complex environment with substantial ambiguity and changing conditions." }
    ]
  }
};
