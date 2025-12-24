import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

const TOUR_COMPLETED_KEY = 'tour_guide_completed';

type TourScreen = 'camera' | 'chat' | null;

interface TourGuideContextType {
    shouldShowTour: boolean;
    currentTourScreen: TourScreen;
    setCurrentTourScreen: (screen: TourScreen) => void;
    startTour: () => void;
    completeTour: () => Promise<void>;
    skipTour: () => Promise<void>;
    isLoading: boolean;
}

const TourGuideContext = createContext<TourGuideContextType | undefined>(undefined);

export function TourGuideProvider({ children }: { children: ReactNode }) {
    const [shouldShowTour, setShouldShowTour] = useState(false);
    const [currentTourScreen, setCurrentTourScreen] = useState<TourScreen>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Check if tour has been completed before
    useEffect(() => {
        checkTourStatus();
    }, []);

    const checkTourStatus = async () => {
        try {
            const completed = await AsyncStorage.getItem(TOUR_COMPLETED_KEY);
            // Tour chưa được hoàn thành thì không show ngay, đợi user quyết định
            setIsLoading(false);
        } catch (error) {
            console.error('Error checking tour status:', error);
            setIsLoading(false);
        }
    };

    const startTour = () => {
        setShouldShowTour(true);
        setCurrentTourScreen('camera');
    };

    const completeTour = async () => {
        try {
            await AsyncStorage.setItem(TOUR_COMPLETED_KEY, 'true');
            setShouldShowTour(false);
            setCurrentTourScreen(null);
        } catch (error) {
            console.error('Error saving tour completion:', error);
        }
    };

    const skipTour = async () => {
        try {
            await AsyncStorage.setItem(TOUR_COMPLETED_KEY, 'true');
            setShouldShowTour(false);
            setCurrentTourScreen(null);
        } catch (error) {
            console.error('Error saving tour skip:', error);
        }
    };

    return (
        <TourGuideContext.Provider
            value={{
                shouldShowTour,
                currentTourScreen,
                setCurrentTourScreen,
                startTour,
                completeTour,
                skipTour,
                isLoading,
            }}
        >
            {children}
        </TourGuideContext.Provider>
    );
}

export function useTourGuide() {
    const context = useContext(TourGuideContext);
    if (context === undefined) {
        throw new Error('useTourGuide must be used within a TourGuideProvider');
    }
    return context;
}
