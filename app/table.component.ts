import {
  Component,
  Input,
  ViewContainerRef,
  Directive,
  Type,
  ViewChildren,
  Injector,
  ComponentFactory,
  ComponentRef,
  ComponentFactoryResolver,
  QueryList,
  ChangeDetectorRef,
  Output,
  EventEmitter,
} from '@angular/core';

type Column<T> = FunctionColumn<T> | ComponentColumn<T>;

/** 
 * Canonical representation of the value of a cell. This value is used
 * for sorting and filtering purposes.
 */
type CellContent = string | number | boolean;

/**
 * Base column component. Any custom column component must extend or
 * implement this class. Defines the member into which the cell data
 * will be inserted and from which the template can read it.
 */
export abstract class ColumnComponent<T> {
  data: T;
}

/**
 * Column component which can be used when the user doesn't need to define
 * a complex template, and a simple transformation function (from data object
 * to string) suffices.
 */
@Component({ template: `{{outputData}}` })
export class FunctionColumnComponent implements ColumnComponent<any> {
  data: any;
  transformFunction: (data: any) => CellContent;

  get outputData(): string {
    return String(this.transformFunction(this.data));
  }
}

/**
 * A column definition object. The content of the cells in this column will be
 * rendered using the template defined in an Angular component.
 */
interface ComponentColumn<T> {
  component: Type<ColumnComponent<T>>;
  title: string;
  /** Whether the contents of this column must be sorted numerically instead of alphabetically. */
  numeric?: boolean;
}

/**
 * A column definition object. The content of the cells in this column will be
 * rendered simply by applying a transformation function to the input data.
 */
interface FunctionColumn<T> {
  func: (data: T) => CellContent;
  title: string;
  /** Whether the contents of this column must be sorted numerically instead of alphabetically. */
  numeric?: boolean;
}

function isComponentColumn<T>(column: Column<T>): column is ComponentColumn<T> {
  return (<ComponentColumn<T>>column).component != undefined;
}

function isFunctionColumn<T>(column: Column<T>): column is FunctionColumn<T> {
  return (<FunctionColumn<T>>column).func != undefined;
}

/**
 * Event which will be emitted when the selected table rows change.
 */
export interface SelectionEvent {
  /**
   * The set of selected data keys. The keys correspond to the index of the data object
   * in the original data array.
   */
  selectedKeys: Set<number>;
  /**
   * The key whose selection status has been changed in this event.
   */
  changedKey?: number;
  /**
   * The new value for the key changed in this event.
   */
  newValue?: boolean;
}

interface Row<T> {
  content: CellContent[];
  data: T;
  key: number;
}

export interface TableModel<T> {
  columns: Column<T>[];
  data: T[];
}

/**
 * Directive used to define insert points for table cells.
 */
@Directive({ selector: '[data-table-cell-insert-point]' })
export class DataTableCellInsertPoint {
  constructor(public viewContainerRef: ViewContainerRef) { }
}


@Component({
  selector: 'data-table',
  styles: [`
    * {
      font-family: sans-serif;
    }
    input {
      border: 1px solid #ccc;
    }
    table {
      border-collapse: collapse;
      width: 100%;
    }
    td, th {
      color: #333;
      font-size: .8em;
      border-top: 1px solid #ccc;
      border-bottom: 1px solid #ccc;
    }
    td.empty {
      height: 40px;
      border-width: 0;
    }
    .cell, th {
      padding: 10px;
    }
    .cell >>> ul {
      margin: 0;
      padding: 0;
    }
    .wrapper {
      border: 1px solid #ccc;
      display: inline-block;
    }
    .filter {
      width: 100px;
    }
    .pager {
      margin: 5px;
      width: 40px;
    }
  `],
  template: `
  <div><div class="wrapper">
  <h2>{{title}}</h2>
  <table>
    <tr>
      <th *ngIf="selectable"></th>
      <th *ngFor="let column of model.columns; let i = index" (click)="setSortingColumn(i)">
          <span *ngIf="isSortedByColumn(i)" [textContent]="descending ? '▲' : '▼'"></span>{{column.title}}
      </th>
    </tr>
    <tr>
      <td *ngIf="selectable"></td>
      <td *ngFor="let column of model.columns; let i = index">
        <input class="filter" [(ngModel)]="filters[i]" (ngModelChange)="handleFilterChanges()">
      </td>
    </tr>
    <tr *ngFor="let row of visibleRows">
      <td *ngIf="selectable">
        <input type="checkbox" [checked]="isSelected(row.key)" (change)="handleSelection(row.key)">
      </td>
      <td *ngFor="let column of model.columns">
        <div class="cell">
          <template data-table-cell-insert-point></template>
        </div>
      </td>
    </tr>
    <tr *ngFor="let row of fillerRows">
      <td *ngIf="selectable" class="empty"></td>
      <td *ngFor="let column of model.columns" class="empty"></td>
    </tr>
  </table>
  <input class="pager" [(ngModel)]="pageSize" (ngModelChange)="handlePagingChanges()" type="number">
  rows per page |
  <input class="pager" [(ngModel)]="visiblePage" (ngModelChange)="handlePagingChanges()" type="number">
  of {{numberOfPages}} pages |
  <button (click)="previousPage()">Previous</button>
  <button (click)="nextPage()">Next</button>
  </div></div>
  `,
})
export class TableComponent {
  @Input() title: string = "";

  /** 
   * The table model. Contains two members:
   * <li>data: Data to render in the table as a list of objects. Each object corresponds
   * to a row in the table, and each cell in the row will be rendered by applying
   * a transformation to said object (which is defined by the column configuration).
   * <li>columns: The column configuration for the table. Columns can be of two types: ComponentColumn
   * or FunctionColumn. ComponentColumns contain an Angular template which will be
   * rendered using the data object. FunctionColumns simply define a transformation function
   * which will return the cell content when applied to the data object.
   */
  @Input() model?: TableModel<any> = null;

  // References to model.columns and model.data to check for changes.
  private oldColumns: Column<any>[] = [];
  private oldData: any[] = [];

  /**
   * Whether the rows of the table are selectable.
   */
  @Input() selectable: boolean = false;

  @Output() selectionChange = new EventEmitter<SelectionEvent>();

  @ViewChildren(DataTableCellInsertPoint) insertPoints: QueryList<DataTableCellInsertPoint>;

  /**
   * Number of rows to show in each page.
   */
  pageSize: number = 5;

  /**
   * Filter strings. This is an array of strings, each of which corresponds, by
   * position, to a search string in each of the columns.
   */
  filters: string[] = [];

  /** 
   * Current page rendered in the table. This is a 0-indexed internal
   * representation.
   */
  private page: number = 0;

  /**
   * Row indexes which are currently selected. The row index corresponds
   * to the position of the data object in the original input data array
   * (this.data).
   */
  private selectionSet = new Set<number>();

  /**
   * Column currently used to sort the table.
   */
  private sortingColumn = 0;

  /** 
   * Whether sorting is ascending or descending.
   */
  private descending = false;

  /**
   * Internal representation of input data. Contains the already
   * processed cell transformations corresponding to the column
   * configuration, to allow sorting and filtering based on the
   * final rendered cells. Sorting of processedData is done in-place.
   */
  private processedData: Row<any>[] = [];

  /**
   * Set of rows in processedData which pass the current filtering
   * settings. This is kept in its own member so changes in paging
   * don't require re-filtering all the rows, and so changes in
   * filtering don't require re-sorting all the rows.
   */
  private filteredData: Row<any>[] = [];

  /**
   * Set of rows which are currently visible in the table.
   */
  private pVisibleRows: Row<any>[] = [];

  constructor(
    private changeDetector: ChangeDetectorRef,
    private factoryResolver: ComponentFactoryResolver,
    private injector: Injector) { }

  get visibleRows(): Row<any>[] { return this.pVisibleRows; }

  get fillerRows(): null[] {
    return Array(this.pageSize - this.pVisibleRows.length).fill(null);
  }

  get numberOfPages() { return Math.ceil(this.filteredData.length / this.pageSize); }

  /** Public 1-based representation of the current page. */
  get visiblePage() { return this.page + 1; }

  /** Public 1-based representation of the current page. */
  set visiblePage(visiblePage: number) {
    if (visiblePage < 1 || visiblePage > this.numberOfPages) return;
    this.page = visiblePage - 1;
  }

  nextPage() {
    this.visiblePage++;
    this.updatePaging();
  }

  previousPage() {
    this.visiblePage--;
    this.updatePaging();
  }

  ngAfterViewChecked() {
    if (!this.model) {
      return;
    }
    if (this.model.columns !== this.oldColumns || this.model.data !== this.oldData) {
      this.handleInputModelChanges();
    }
    this.oldColumns = this.model.columns;
    this.oldData = this.model.data;
  }

  /**
   * Whether the given row key is selected.
   */
  isSelected(rowKey: number) {
    return this.selectionSet.has(rowKey);
  }

  /**
   * Register a change in the selection status for a given row key.
   */
  handleSelection(rowKey: number) {
    this.isSelected(rowKey) ? this.selectionSet.delete(rowKey) : this.selectionSet.add(rowKey);
    this.selectionChange.emit({
      selectedKeys: new Set(this.selectionSet),
      changedKey: rowKey,
      newValue: this.isSelected(rowKey),
    })
  }

  /**
   * Resets the row selection.
   */
  resetSelection() {
    this.selectionSet.clear();
    this.selectionChange.emit({
      selectedKeys: new Set()
    })
  }

  /**
   * Sets the sorting column and updates the view.
   */
  setSortingColumn(index: number) {
    this.descending = this.sortingColumn === index ? !this.descending : false;
    this.sortingColumn = index;
    this.updateSortingFilteringAndPaging();
  }

  isSortedByColumn(index: number) {
    return this.sortingColumn === index;
  }

  /**
   * Triggers a view update to reflect new filter values.
   */
  handleFilterChanges() {
    this.page = 0;
    this.updateFilteringAndPaging();
  }

  /**
   * Triggers a view update to reflect new paging settings.
   */
  handlePagingChanges() {
    this.updatePaging();
  }

  private handleInputModelChanges() {
    this.sortingColumn = 0;
    this.descending = false;
    this.filters = Array(this.model.columns.length).fill('');
    console.time('Initial data processing');
    this.processedData = this.processModel(this.model);
    console.timeEnd('Initial data processing');
    this.resetSelection();
    this.updateSortingFilteringAndPaging();
  }

  /**
   * Updates the view. Applies sorting, filtering and paging settings.
   */
  private updateSortingFilteringAndPaging() {
    console.time('Sorting data');
    TableComponent.sortData(this.processedData, this.sortingColumn, this.descending, this.model.columns[this.sortingColumn].numeric);
    console.timeEnd('Sorting data');
    this.updateFilteringAndPaging();
  }

  /**
   * Updates the view. Applies filtering and paging settings, but maintains previously
   * existing sorting.
   */
  private updateFilteringAndPaging() {
    console.time('Filtering data');
    this.filteredData = TableComponent.filterData(this.processedData, this.filters);
    console.timeEnd('Filtering data');
    this.updatePaging();
  }

  /**
   * Updates the view. Applies paging settings, but maintains previously existing
   * filtering and sorting settings.
   */
  private updatePaging() {
    this.paint(TableComponent.pageData(this.filteredData, this.page, this.pageSize));
  }

  /**
   * Processes input data. Generates an internal representation of all the
   * table rows, so we can perform sorting and filtering operations on
   * the generated content.
   */
  private processModel<T>({data, columns}: TableModel<T>): Row<T>[] {
    const genFunctions: ((data: T) => CellContent)[] = [];
    const componentRefs: ComponentRef<ColumnComponent<T>>[] = [];
    for (let column of columns) {
      if (isComponentColumn(column)) {
        const factory = this.factoryResolver.resolveComponentFactory(column.component);
        const element = document.createElement('DIV');
        const componentRef = factory.create(this.injector, null, element);
        componentRefs.push(componentRef);
        const genFunction = (data: T) => {
          componentRef.instance.data = data;
          componentRef.changeDetectorRef.detectChanges();
          return element.textContent;
        }
        genFunctions.push(genFunction);
      } else if (isFunctionColumn(column)) {
        genFunctions.push(column.func);
      } else {
        throw new Error('Assertion error: Unexpected column object.');
      }
    }

    const processedData = data.map((data, key) => ({
      content: genFunctions.map((func) => func(data)),
      key,
      data,
    }));
    componentRefs.forEach((ref) => ref.destroy());
    return processedData;
  }

  /**
   * Paints the given rows into the table view.
   */
  private paint<T>(rows: Row<T>[]) {
    this.pVisibleRows = rows;
    this.changeDetector.detectChanges();
    const insertPoints = this.insertPoints.toArray().reverse();
    insertPoints.forEach((insertPoint) => insertPoint.viewContainerRef.clear());
    for (let row of rows) {
      for (let column of this.model.columns) {
        const insertPoint = insertPoints.pop();
        let ref: ComponentRef<ColumnComponent<T> | FunctionColumnComponent>;
        if (isComponentColumn(column)) {
          const factory = this.factoryResolver.resolveComponentFactory(column.component);
          const compRef = insertPoint.viewContainerRef.createComponent(factory);
          compRef.instance.data = row.data;
          ref = compRef;
        } else if (isFunctionColumn(column)) {
          const factory = this.factoryResolver.resolveComponentFactory(FunctionColumnComponent);
          const compRef = insertPoint.viewContainerRef.createComponent(factory);
          compRef.instance.transformFunction = column.func;
          compRef.instance.data = row.data;
          ref = compRef;
        } else {
          throw new Error('Assertion error: Unexpected column object.');
        }
        ref.changeDetectorRef.detectChanges();
        ref.changeDetectorRef.detach();
      }
    }
  }

  /**
   * Filters a list of rows based on a list of search strings.
   */
  private static filterData<T>(rows: Row<T>[], filters: string[]): Row<T>[] {
    const res = filters.map((search) => search ? new RegExp(search) : null);
    return rows.filter((row: Row<T>) => {
      const failPredicate = (re: RegExp, i: number) => {
        return re != null && !re.test(String(row.content[i]));
      };
      return !res.some(failPredicate);
    });
  }

  /**
   * Pages a list of rows, based on passed paging settings.
   */
  private static pageData<T>(rows: Row<T>[], page: number, pageSize: number): Row<T>[] {
    const offset = page * pageSize;
    const last = (page + 1) * pageSize;
    return rows.slice(offset, last);
  }

  /**
   * Sorts a list of rows.
   * @param rows The list of rows to sort.
   * @param i The column by which to sort the rows.
   * @param descending Whether to sort ascending or descending.
   * @param numeric Whether the cell content should be treated as a number for sorting.
   *     The first number in the cell will be extracted and used for sorting.
   */
  private static sortData<T>(rows: Row<T>[], i: number, descending: boolean, numeric: boolean = false) {
    const compareFunction = (a: Row<T>, b: Row<T>) => {
      const val1 = a.content[i];
      const val2 = b.content[i];
      // Remove all the characters until the first number
      const nonNumericPrefixRegexp = /^[^0-9]+/;
      // parseFloat will extract as much as it can from the beginning of the string
      const numVal1 = parseFloat(String(val1).replace(nonNumericPrefixRegexp, ''));
      const numVal2 = parseFloat(String(val2).replace(nonNumericPrefixRegexp, ''));
      const multiplier = descending ? -1 : 1;
      if (numeric && (numVal1 > numVal2)) return multiplier;
      if (numeric && (numVal1 < numVal2)) return -multiplier;
      // If numeric comparison is the same, fallback to non-numeric
      if (val1 > val2) return multiplier;
      if (val1 < val2) return -multiplier;
      return 0;
    };
    rows.sort(compareFunction);
  }
}


