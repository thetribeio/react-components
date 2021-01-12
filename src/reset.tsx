import { createGlobalStyle } from 'styled-components';
import reset from 'styled-reset';
import MontserratRegular from '../assets/fonts/montserrat/Montserrat-Regular.ttf';

const Reset = createGlobalStyle`
  ${reset}
  @font-face {
    font-family: 'Montserrat';
    font-style: normal;
    font-weight: 400;
    src: url(${MontserratRegular});
  }
  html, body {
    font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    line-height: normal !important;
  }
`;

export default Reset;
