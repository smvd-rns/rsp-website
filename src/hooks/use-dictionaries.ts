import { useContentTypes } from "./use-content-types";
import { useEvents } from "./use-events";
import { useLanguages } from "./use-languages";
import { useSpeakers } from "./use-speakers";
import { useVenues } from "./use-venues";

export const useDictionaries = () => {
  const speakersQuery = useSpeakers();
  const languagesQuery = useLanguages();
  const contentTypesQuery = useContentTypes();
  const venuesQuery = useVenues();
  const eventsQuery = useEvents();

  return {
    speakers: speakersQuery.data || [],
    languages: languagesQuery.data || [],
    contentTypes: contentTypesQuery.data || [],
    venues: venuesQuery.data || [],
    events: eventsQuery.data || [],
    isLoading:
      speakersQuery.isLoading ||
      languagesQuery.isLoading ||
      contentTypesQuery.isLoading ||
      venuesQuery.isLoading ||
      eventsQuery.isLoading,
  };
};
