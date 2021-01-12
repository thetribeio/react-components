import 'styled-components';
import { Theme } from '../src/theme-provider';

declare module 'styled-components' {
  export interface DefaultTheme extends Theme {} // eslint-disable-line
}
