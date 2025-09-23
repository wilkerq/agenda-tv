/**
 * Determines the type of transmission based on the event location.
 * This is a synchronous function and can be used on the client or server.
 * @param location The event location string.
 * @returns 'tv' for the main plenary, 'youtube' otherwise.
 */
export const determineTransmission = (location: string): 'youtube' | 'tv' => {
    if (location === "Plenário Iris Rezende Machado") {
        return "tv";
    }
    return "youtube";
};
