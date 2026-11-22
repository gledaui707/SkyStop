import { IntroSlides } from '../features/onboarding/IntroSlides'

/** First run: the three photographic intro slides. Get started on the last slide opens Home with nothing saved (a guest
 *  session, shown with the SS transition); Skip goes to Account Access. Flights are added from Home (Add flight). */
export function Welcome() {
  return <IntroSlides />
}
