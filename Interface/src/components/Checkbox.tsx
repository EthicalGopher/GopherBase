import React, { useId } from 'react';
import styled from 'styled-components';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Checkbox: React.FC<CheckboxProps> = (props) => {
  const generatedId = useId();
  const id = props.id || generatedId;

  return (
    <StyledWrapper>
      <div className="checkbox-container">
        <div className="checkbox-wrapper">
          <input className="checkbox" type="checkbox" {...props} id={id} />
          <label className="checkbox-label" htmlFor={id}>
            <div className="checkbox-flip">
              <div className="checkbox-front">
                <svg fill="white" height={32} width={32} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19 13H12V19H11V13H5V12H11V6H12V12H19V13Z" className="icon-path" />
                </svg>
              </div>
              <div className="checkbox-back">
                <svg fill="white" height={32} width={32} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 19l-7-7 1.41-1.41L9 16.17l11.29-11.3L22 6l-13 13z" className="icon-path" />
                </svg>
              </div>
            </div>
          </label>
        </div>
      </div>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  .checkbox-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    margin: 0;
  }

  .checkbox {
    display: none;
  }

  .checkbox-label {
    position: relative;
    display: inline-flex;
    align-items: center;
    cursor: pointer;
  }

  .checkbox-flip {
    width: 32px;
    height: 32px;
    perspective: 1000px;
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
    transition: transform 0.4s ease;
    transform-style: preserve-3d;
  }

  .checkbox-front,
  .checkbox-back {
    width: 100%;
    height: 100%;
    position: absolute;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 8px;
    backface-visibility: hidden;
    transition: transform 0.3s ease;
  }

  .checkbox-front {
    background: linear-gradient(135deg, #3f3f46, #27272a); /* zinc-700 to zinc-800 */
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    transform: rotateY(0deg);
  }

  .checkbox-back {
    background: linear-gradient(135deg, #10b981, #059669); /* emerald-500 to emerald-600 */
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    transform: rotateY(180deg);
  }

  .checkbox-wrapper:hover .checkbox-flip {
    transform: scale(1.05);
    transition: transform 0.4s ease-out;
  }

  .checkbox:checked + .checkbox-label .checkbox-front {
    transform: rotateY(180deg);
  }

  .checkbox:checked + .checkbox-label .checkbox-back {
    transform: rotateY(0deg);
  }

  .checkbox:focus + .checkbox-label .checkbox-flip {
    box-shadow:
      0 0 10px rgba(16, 185, 129, 0.4),
      0 0 15px rgba(5, 150, 105, 0.2);
    transition: box-shadow 0.3s ease;
  }

  .icon-path {
    stroke: white;
    stroke-width: 2;
    fill: transparent;
  }
  
  svg {
    width: 16px;
    height: 16px;
  }
`;

export default Checkbox;
