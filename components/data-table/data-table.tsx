"use client";

import { useRef, useState, useEffect } from "react";
import type { Table as TanStackTable } from "@tanstack/react-table";
import { flexRender } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from "@/components/data-table/data-table-primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

interface DataTableProps<TData> {
  table: TanStackTable<TData>;
  isFetching: boolean;
}

export function DataTable<TData>({ table, isFetching }: DataTableProps<TData>) {
  const rows = table.getRowModel().rows;
  const columnCount = table.getAllColumns().length;

  const scrollRef = useRef<HTMLDivElement>(null);
  const [isScrolledX, setIsScrolledX] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setIsScrolledX(el.scrollLeft > 0);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-auto overscroll-contain"
      >
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header, index) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      "text-muted-foreground",
                      index === 0 && "sticky left-0 z-40",
                      index === 0 && isScrolledX && "border-r",
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length > 0
              ? rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="group/row"
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell, index) => (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          index === 0 &&
                            "sticky left-0 z-20 bg-background group-hover/row:bg-[color-mix(in_oklch,var(--muted)_50%,var(--background))] group-data-[state=selected]/row:bg-muted",
                          index === 0 && isScrolledX && "border-r",
                        )}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : !isFetching && (
                  <TableRow>
                    <TableCell
                      colSpan={columnCount}
                      className="h-24 text-center"
                    >
                      No results.
                    </TableCell>
                  </TableRow>
                )}
          </TableBody>
        </Table>
      </div>
      <DataTableFooter table={table} />
    </div>
  );
}

function DataTableFooter<TData>({ table }: { table: TanStackTable<TData> }) {
  const pageCount = table.getPageCount();
  const currentPage = table.getState().pagination.pageIndex + 1;
  const rowCount = table.getRowCount();
  const [inputValue, setInputValue] = useState(String(currentPage));

  useEffect(() => {
    setInputValue(String(currentPage));
  }, [currentPage]);

  const commitPage = (val: string) => {
    const num = Number(val);
    if (num >= 1 && num <= pageCount) {
      table.setPageIndex(num - 1);
    } else {
      setInputValue(String(currentPage));
    }
  };

  return (
    <footer className="flex h-10 shrink-0 items-center gap-1 border-t border-border bg-background px-1">
      <Button
        variant="outline"
        size="icon-sm"
        onClick={() => table.previousPage()}
        disabled={!table.getCanPreviousPage()}
      >
        <ChevronLeftIcon />
      </Button>
      <Label className="text-xs text-muted-foreground">Page</Label>
      <Input
        className="h-7 w-12 rounded-[min(var(--radius-md),12px)] px-1 text-center text-xs"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={(e) => commitPage(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commitPage(inputValue);
        }}
      />
      <Label className="text-xs text-muted-foreground">of {pageCount}</Label>
      <Button
        variant="outline"
        size="icon-sm"
        onClick={() => table.nextPage()}
        disabled={!table.getCanNextPage()}
      >
        <ChevronRightIcon />
      </Button>
      <Label className="text-xs text-muted-foreground">
        {rowCount} records
      </Label>
    </footer>
  );
}
