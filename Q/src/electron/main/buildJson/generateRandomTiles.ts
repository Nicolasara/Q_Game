import {
  Color,
  Shape,
  colorList,
  shapeList
} from '../../../game/types/map.types';

const generateRandomTiles = (num: number) => {
  const jsonTiles: { color: Color; shape: Shape }[] = [];
  for (let i = 0; i < num; i++) {
    const randColorIndex = Math.floor(Math.random() * 6);
    const randShapeIndex = Math.floor(Math.random() * 6);

    const color = colorList[randColorIndex];
    const shape = shapeList[randShapeIndex];
    jsonTiles.push({ color, shape });
  }
};

generateRandomTiles(10);
