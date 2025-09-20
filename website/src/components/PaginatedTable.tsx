import { useMemo, useState } from "react";

interface PaginatedTableProps<T> {
  data: T[];
  renderTable: (filteredData: T[], startIndex: number) => React.ReactNode;
  filterFn?: (item: T) => boolean;
  defaultItemsPerPage?: number;
}

/**
 * A generic paginated table component that allows for filtering and pagination.
 * @param {PaginatedTableProps} props - The properties for the paginated table.
 * @param props.data - The data to be displayed in the table.
 * @param props.renderTable - A function that takes the filtered data and returns the table JSX.
 * @param props.filterFn - An optional filter function to filter the data before displaying it.
 * @param props.defaultItemsPerPage - The default number of items to display per page.
 * @returns {JSX.component} A paginated table component.
 */
export const PaginatedTable = <T,>({
  data,
  renderTable,
  filterFn,
  defaultItemsPerPage = 10,
}: PaginatedTableProps<T>) => {
  const [itemsPerPage, setItemsPerPage] = useState(defaultItemsPerPage);
  const [currentPage, setCurrentPage] = useState(1);

  const filteredData = useMemo(
    () => (filterFn ? data.filter(filterFn) : data),
    [data, filterFn]
  );

  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const start = (currentPage - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const currentItems = filteredData.slice(start, end);

  const handleItemsPerPageChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="">
      <div className="flex justify-between items-center mb-4">
        <div>
          <label className="text-sm text-text mr-2">Show:</label>
          <select
            onChange={handleItemsPerPageChange}
            className="card text-text px-2 py-1 rounded text-sm"
            value={itemsPerPage}
          >
            <option value="10">10 Per Page</option>
            <option value="20">20 Per Page</option>
            <option value="50">50 Per Page</option>
          </select>
        </div>

        <div className="text-sm text-text">
          Page {currentPage} of {totalPages}
        </div>
      </div>

      {renderTable(currentItems, start)}

      <div className="flex justify-center items-center mt-4 space-x-2">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="button-gray px-3 py-1 rounded text-text text-sm disabled:opacity-50 transition duration-200"
        >
          Previous
        </button>
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="button-gray px-3 py-1 rounded text-text text-sm disabled:opacity-50 transition duration-200"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default PaginatedTable;
