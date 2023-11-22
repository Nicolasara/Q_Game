import { JMap, JRow, JState } from '../types';

export const validateJState = (jState: JState) => {
  if (jState.players.length === 0) {
    throw new Error('players must be non empty');
  }
  validateJMap(jState.map);
};

const validateJMap = (jMap: JMap) => {
  const rowIndexNumbers: number[] = [];
  jMap.forEach((jRow) => {
    const rowIndex = jRow[0];
    if (rowIndexNumbers.includes(rowIndex)) {
      throw new Error('RowIndex cannot overlap');
    }
    rowIndexNumbers.push(rowIndex);
    validateJRow(jRow);
  });

  rowIndexNumbers.sort((a, b) => a - b);
  for (let i = 0; i < rowIndexNumbers.length - 1; i++) {
    if (rowIndexNumbers[i] + 1 !== rowIndexNumbers[i + 1]) {
      throw new Error('RowIndex set cannot contain gaps');
    }
  }
};

const validateJRow = (jRow: JRow) => {
  if (jRow.length === 1) {
    throw new Error('JRows JCell sequence must not be empty');
  }

  const columnIndexNumbers = new Set<number>();
  jRow.forEach((jCell, index) => {
    if (index !== 0 && typeof jCell !== 'number') {
      const columnIndex = jCell[0];
      if (columnIndexNumbers.has(columnIndex)) {
        throw new Error('JCell column index must form a set (no duplicates)');
      }
      columnIndexNumbers.add(columnIndex);
    }
  });
};

// const validateJCell = (JCell: )
