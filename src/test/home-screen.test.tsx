import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HomeScreen } from "@/screens/HomeScreen";
import type { UserProgressState } from "@/types/elovio";

describe("HomeScreen", () => {
  it("renders dedicated pure listening school button at the top and triggers callback on click", () => {
    const onStartListeningSchool = vi.fn();
    const progress: UserProgressState = {
      preferences: {
        nativeLanguage: "fi",
        targetLanguage: "es",
        dailyGoalMinutes: 10,
      },
      learnedSentenceIds: [],
      completedLessonIds: [],
      studySecondsByDate: {},
      liveSecondsByDate: {},
      reviewQueue: [],
    };

    render(
      <HomeScreen
        progress={progress}
        onContinueExercise={vi.fn()}
        onStartListeningSchool={onStartListeningSchool}
        onNavigateTab={vi.fn()}
      />,
    );

    const listeningBtn = screen.getByRole("button", {
      name: /Aloita pelkkä kuuntelukoulu/i,
    });
    expect(listeningBtn).toBeInTheDocument();
    expect(screen.getByText("Tervetuloa Elovioon!")).toBeInTheDocument();

    fireEvent.click(listeningBtn);
    expect(onStartListeningSchool).toHaveBeenCalledTimes(1);
  });

  it("generates and copies a unique learning path URL when clicking Jaa polku", async () => {
    const onShareLearningPath = vi.fn().mockResolvedValue({
      url: "https://elovio.example/?path=sample123",
      copied: true,
    });

    const progress: UserProgressState = {
      preferences: {
        nativeLanguage: "fi",
        targetLanguage: "es",
        dailyGoalMinutes: 10,
      },
      learnedSentenceIds: ["greet-1"],
      completedLessonIds: [],
      studySecondsByDate: {},
      liveSecondsByDate: {},
      reviewQueue: [],
    };

    render(
      <HomeScreen
        progress={progress}
        onContinueExercise={vi.fn()}
        onStartListeningSchool={vi.fn()}
        onShareLearningPath={onShareLearningPath}
        onNavigateTab={vi.fn()}
      />,
    );

    const shareBtn = screen.getByRole("button", {
      name: /Jaa oppimispolku/i,
    });
    fireEvent.click(shareBtn);

    expect(onShareLearningPath).toHaveBeenCalledTimes(1);
    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent("https://elovio.example/?path=sample123");
  });
});
