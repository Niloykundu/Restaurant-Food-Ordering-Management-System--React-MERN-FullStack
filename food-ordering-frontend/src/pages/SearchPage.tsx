import { useSearchRestaurants } from "@/api/RestaurantApi";
import CuisineFilter from "@/components/CuisineFilter";
import PaginationSelector from "@/components/PaginationSelector";
import SearchBar, { SearchForm } from "@/components/SearchBar";
import SearchResultCard from "@/components/SearchResultCard";
import SearchResultInfo from "@/components/SearchResultInfo";
import SortOptionDropdown from "@/components/SortOptionDropdown";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { useCitySearch } from "@/api/CityApi";
import { useParams, useNavigate } from "react-router-dom";

export type SearchState = {
  searchQuery: string;
  page: number;
  selectedCuisines: string[];
  sortOption: string;
};

const SearchPage = () => {
  const { city: cityParam } = useParams();
  const { cities } = useCitySearch();
  const navigate = useNavigate();
  const [searchState, setSearchState] = useState<SearchState>({
    searchQuery: "",
    page: 1,
    selectedCuisines: [],
    sortOption: "bestMatch",
  });
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const city = cityParam || "all";
  const { results, isLoading } = useSearchRestaurants(searchState, city);

  const setSortOption = (sortOption: string) => {
    setSearchState((prevState) => ({
      ...prevState,
      sortOption,
      page: 1,
    }));
  };

  const setSelectedCuisines = (selectedCuisines: string[]) => {
    setSearchState((prevState) => ({
      ...prevState,
      selectedCuisines,
      page: 1,
    }));
  };

  const setPage = (page: number) => {
    setSearchState((prevState) => ({
      ...prevState,
      page,
    }));
  };

  const handleSearch = (formValues: SearchForm) => {
    const inputCity = formValues.city?.trim() || "";
    // If city is not empty and not in the list, show no results
    if (
      inputCity &&
      !cities.some((c) => c.toLowerCase() === inputCity.toLowerCase())
    ) {
      setSearchState((prevState) => ({
        ...prevState,
        searchQuery: formValues.searchQuery ?? "",
        page: 1,
      }));
      navigate(`/search/${inputCity}`);
      return;
    }
    const cityParam = inputCity !== "" ? inputCity : "all";
    setSearchState((prevState) => ({
      ...prevState,
      searchQuery: formValues.searchQuery ?? "",
      page: 1,
    }));
    navigate(`/search/${cityParam}`);
  };

  const resetSearch = () => {
    setSearchState((prevState) => ({
      ...prevState,
      searchQuery: "",
      page: 1,
    }));
  };

  // If city is not in the list, show no results
  if (
    city !== "all" &&
    !cities.some((c) => c.toLowerCase() === city.toLowerCase())
  ) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px]">
        <span className="text-lg font-semibold text-gray-700">
          Sorry, there is no restaurant near to your search area.
        </span>
      </div>
    );
  }
  if (!results?.data || results.data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px]">
        <span className="text-lg font-semibold text-gray-700">
          Sorry, there is no restaurant near to your search area.
        </span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[250px_1fr] gap-5">
      <div id="cuisines-list">
        <CuisineFilter
          selectedCuisines={searchState.selectedCuisines}
          onChange={setSelectedCuisines}
          isExpanded={isExpanded}
          onExpandedClick={() =>
            setIsExpanded((prevIsExpanded) => !prevIsExpanded)
          }
        />
      </div>
      <div id="main-content" className="flex flex-col gap-5">
        <SearchBar
          searchQuery={searchState.searchQuery}
          onSubmit={handleSearch}
          placeHolder="Search by Cuisine or Restaurant Name"
          onReset={resetSearch}
          city={city}
        />
        {isLoading ? (
          <>
            <div className="flex justify-between flex-col gap-3 lg:flex-row">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-10 w-40" />
            </div>
            {[...Array(5)].map((_, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-4">
                <div className="flex gap-4">
                  <Skeleton className="h-32 w-32 rounded-md" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-2/3" />
                    <div className="flex gap-2 mt-2">
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </>
        ) : (
          <>
            <div className="flex justify-between flex-col gap-3 lg:flex-row">
              <SearchResultInfo total={results?.pagination?.total || 0} city={city} />
              <SortOptionDropdown
                sortOption={searchState.sortOption}
                onChange={(value) => setSortOption(value)}
              />
            </div>

            {results?.data?.map((restaurant) => (
              <SearchResultCard restaurant={restaurant} key={restaurant._id} />
            ))}
            {results?.pagination && (
              <PaginationSelector
                page={results.pagination.page}
                pages={results.pagination.pages}
                onPageChange={setPage}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
